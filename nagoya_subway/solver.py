import clingo

files = ["setting/station.lp", "setting/zone.lp", "subway_rules.lp"]

class SubwaySolver:
    def __init__(self, static_files):
        self.static_files = static_files
        self.station_map = {} # IDと駅名の対応表
        self._load_station_names()

    def _load_station_names(self):
        """
        IDと駅名の対応表を作成する
        """
        print("Loading station data for mapping...")
        ctl = clingo.Control(["--warn=none"])
        
        loaded = False
        for f in self.static_files:
            if "station" in f:
                ctl.load(f)
                loaded = True
        
        if not loaded:
            print("Warning: No 'station' file found in static_files.")
            return

        ctl.add("base", [], "#program base.") 
        ctl.ground([("base", [])])
        
        for atom in ctl.symbolic_atoms.by_signature("station", 2):
            station_id = str(atom.symbol.arguments[0])
            try:
                station_name = atom.symbol.arguments[1].string
            except RuntimeError:
                station_name = str(atom.symbol.arguments[1]).strip('"')
                
            self.station_map[station_id] = station_name

    def solve(self, endpoints=None, via_hard=None, via_soft=None, budget=5, min_budget=1):
        if endpoints is None: endpoints = []
        if via_hard is None: via_hard = []
        if via_soft is None: via_soft = []

        if len(endpoints) > 2:
            raise ValueError("端点は2つまでしか指定できません")

        ctl = clingo.Control(["--opt-mode=optN", "--models=0","--warn=none"])

        for f in self.static_files:
            ctl.load(f)

        req_str = ""
        for ep in endpoints:
            req_str += f'endpoint("{ep}").\n'
        for v in via_hard:
            req_str += f'request("{v}", hard).\n'
        for v in via_soft:
            req_str += f'request("{v}", soft).\n'
        if budget:
            req_str += f'budget({min_budget},{budget}).\n'
        
        ctl.add("base", [], req_str)
        
        try:
            ctl.ground([("base", [])])
        except RuntimeError as e:
            print(f"Grounding Error: {e}")
            return []

        raw_routes = []
        with ctl.solve(yield_=True) as handle:
            for model in handle:
                parsed = self._parse_model(model)
                if parsed:
                    raw_routes.append(parsed)
        
        final_routes = self._filter_contained_routes(raw_routes)
        return final_routes

    def _parse_model(self, model):
        """
        clingoの解から,選ばれたルートと料金区間，通った駅,達成度,駅数を取り出す
        """
        chosen_edges = {}
        zone_val = 0
        satisfied = []
        optimization_score = 0
        
        if model.cost:
            optimization_score = model.cost[0]

        for atom in model.symbols(shown=True):
            name = atom.name
            args = atom.arguments

            if name == "warning":
                print(f"Warning : {args[0]} - {args[1]}")
            
            if name == "chosen":
                u = str(args[0])
                v = str(args[1])
                chosen_edges[u] = v
            
            elif name == "zone":
                zone_val = int(args[0].number)
            
            elif name == "satisfied":
                try:
                    s_name = args[0].string
                except:
                    s_name = str(args[0]).strip('"')
                satisfied.append(s_name)

        if not chosen_edges:
            return None

        # --- ルートの復元 ---
        destinations = set(chosen_edges.values())
        start_node = None
        for u in chosen_edges.keys():
            if u not in destinations:
                start_node = u
                break
        
        if start_node is None:
            return None 

        route_ids = []
        curr = start_node
        route_ids.append(curr)
        
        max_steps = len(self.station_map) + 10
        steps = 0

        while curr in chosen_edges:
            next_node = chosen_edges[curr]
            route_ids.append(next_node)
            curr = next_node
            steps += 1
            if steps > max_steps:
                break

        raw_names = [self.station_map.get(rid, rid) for rid in route_ids]
        route_names = []
        for name in raw_names:
            if not route_names or name != route_names[-1]:
                route_names.append(name)

        return {
            "route_ids": route_ids,
            "route_names": route_names,
            "zone": zone_val,
            "satisfied": sorted(satisfied),
            "score": optimization_score,
            "stations_count": len(route_ids)
        }

    def _filter_contained_routes(self, routes):
        """
        料金(zone)とスコアが同じで、かつ通過駅が完全に包含されているルートを削除する。
        """
        if not routes:
            return []
        
        min_score = min(r['score'] for r in routes)
        best_routes = [r for r in routes if r['score'] == min_score]

        route_strings = ["," + ",".join(r['route_ids']) + "," for r in best_routes]

        to_remove = [False] * len(best_routes)

        for i in range(len(best_routes)):
            if to_remove[i]: continue

            for j in range(len(best_routes)):
                if i == j: continue
                if to_remove[j]: continue

                ra = best_routes[i]
                rb = best_routes[j]
                
                if ra['zone'] != rb['zone']:
                    continue

                str_a = route_strings[i]
                str_b = route_strings[j]

                if str_a in str_b and str_a != str_b:
                    to_remove[i] = True
                    break
                elif str_b in str_a and str_a != str_b:
                    to_remove[j] = True
                elif str_a == str_b and i > j:
                    to_remove[i] = True

        return [r for k, r in enumerate(best_routes) if not to_remove[k]]

# --- 実行テスト用 ---
if __name__ == "__main__":
    solver = SubwaySolver(files)
    print("\n=== 検索テスト ===")
    try:
        results = solver.solve(
            endpoints=[],
            via_hard=["Kawana","Yagoto"],
            via_soft=[],
            budget=5,
            min_budget=1
        )

        if not results:
            print("条件を満たすルートが見つかりませんでした。")
        else:
            print(f"🎉 {len(results)} 件のルートが見つかりました")
            for i, r in enumerate(results):
                print(f"\n[Route {i+1}]  料金区間:{r['zone']}, 要求を満たせなかった駅:{r['score']}")
                print(" -> ".join(r['route_names']))
    except Exception as e:
        print(f"Runtime Error: {e}")