from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import clingo


class SubwaySolver:
    """clingoのモデルを列挙し，画面で比較できる候補へ変換する．"""

    def __init__(self, static_files: list[Path]):
        self.static_files = [Path(path).resolve() for path in static_files]
        self.station_map: dict[str, str] = {}
        self.station_names: set[str] = set()
        self._load_station_names()

    def _load_station_names(self) -> None:
        station_file = next(path for path in self.static_files if path.name == "station.lp")
        control = clingo.Control(["--warn=none"])
        control.load(str(station_file))
        control.ground([("base", [])])

        for atom in control.symbolic_atoms.by_signature("station", 2):
            station_id = str(atom.symbol.arguments[0])
            station_name = atom.symbol.arguments[1].string
            self.station_map[station_id] = station_name
            self.station_names.add(station_name)

    def solve(
        self,
        *,
        endpoints: list[str],
        via_hard: list[str],
        via_soft: list[str],
        avoid: list[str],
        budget: int,
        min_budget: int,
        max_results: int = 50,
        timeout_seconds: float = 6.0,
    ) -> dict[str, Any]:
        if len(endpoints) > 2:
            raise ValueError("始発・終着は2駅まで指定できる．")
        if not 1 <= min_budget <= budget <= 5:
            raise ValueError("料金区は1区から5区の範囲で，下限を上限以下にする必要がある．")

        requested = set(endpoints + via_hard + via_soft + avoid)
        unknown = requested - self.station_names
        if unknown:
            raise ValueError(f"存在しない駅が指定された：{', '.join(sorted(unknown))}")

        control = clingo.Control(["--models=0", "--warn=none"])
        for path in self.static_files:
            control.load(str(path))

        facts = []
        for station in endpoints:
            facts.append(f"endpoint({self._quote(station)}).")
        for station in via_hard:
            facts.append(f"request({self._quote(station)},hard).")
        for station in via_soft:
            facts.append(f"request({self._quote(station)},soft).")
        for station in avoid:
            facts.append(f"avoid({self._quote(station)}).")
        facts.append(f"budget({min_budget},{budget}).")
        control.add("base", [], "\n".join(facts))
        control.ground([("base", [])])

        started_at = time.monotonic()
        frontier: dict[tuple[int, tuple[str, ...]], list[dict[str, Any]]] = {}
        seen_paths: set[tuple[str, ...]] = set()
        timed_out = False
        model_count = 0

        with control.solve(yield_=True, async_=True) as handle:
            handle.resume()
            while True:
                if not handle.wait(0.05):
                    if time.monotonic() - started_at >= timeout_seconds:
                        timed_out = True
                        handle.cancel()
                        break
                    continue

                model = handle.model()
                if model is None:
                    break

                model_count += 1
                parsed = self._parse_model(model, len(via_soft))
                if parsed:
                    self._add_to_frontier(frontier, seen_paths, parsed)

                if time.monotonic() - started_at >= timeout_seconds:
                    timed_out = True
                    handle.cancel()
                    break
                handle.resume()

        filtered = [route for routes in frontier.values() for route in routes]
        filtered.sort(key=lambda route: (-len(route["satisfied"]), route["zone"], -route["stations_count"]))
        has_more = timed_out or len(filtered) > max_results
        results = filtered[:max_results]

        return {
            "results": results,
            "search": {
                "complete": not timed_out,
                "timed_out": timed_out,
                "has_more": has_more,
                "returned_count": len(results),
                "models_seen": model_count,
            },
        }

    @staticmethod
    def _quote(value: str) -> str:
        return json.dumps(value, ensure_ascii=False)

    def _parse_model(self, model: clingo.Model, preferred_count: int) -> dict[str, Any] | None:
        chosen_edges: dict[str, str] = {}
        zone = 0
        satisfied: list[str] = []
        warnings: list[str] = []

        for atom in model.symbols(shown=True):
            if atom.name == "chosen":
                chosen_edges[str(atom.arguments[0])] = str(atom.arguments[1])
            elif atom.name == "zone":
                zone = atom.arguments[0].number
            elif atom.name == "satisfied":
                satisfied.append(atom.arguments[0].string)
            elif atom.name == "warning":
                first = atom.arguments[0].string if atom.arguments[0].type == clingo.SymbolType.String else str(atom.arguments[0])
                second = atom.arguments[1].string if atom.arguments[1].type == clingo.SymbolType.String else str(atom.arguments[1])
                warnings.append(f"{first} - {second}")

        if not chosen_edges:
            return None

        destinations = set(chosen_edges.values())
        start = next((station for station in chosen_edges if station not in destinations), None)
        if start is None:
            return None

        route_ids = [start]
        current = start
        for _ in range(len(self.station_map) + 1):
            if current not in chosen_edges:
                break
            current = chosen_edges[current]
            route_ids.append(current)

        route_names: list[str] = []
        for station_id in route_ids:
            name = self.station_map.get(station_id, station_id)
            if not route_names or route_names[-1] != name:
                route_names.append(name)

        unique_satisfied = sorted(set(satisfied))
        return {
            "route_ids": route_ids,
            "route_names": route_names,
            "zone": zone,
            "logs": warnings,
            "satisfied": unique_satisfied,
            "score": preferred_count - len(unique_satisfied),
            "stations_count": len(route_names),
        }

    @staticmethod
    def _add_to_frontier(
        frontier: dict[tuple[int, tuple[str, ...]], list[dict[str, Any]]],
        seen_paths: set[tuple[str, ...]],
        route: dict[str, Any],
    ) -> None:
        path = tuple(route["route_names"])
        canonical_path = min(path, tuple(reversed(path)))
        if canonical_path in seen_paths:
            return
        seen_paths.add(canonical_path)

        group_key = (route["zone"], tuple(route["satisfied"]))
        group = frontier.setdefault(group_key, [])
        station_set = set(path)

        if any(station_set < set(existing["route_names"]) for existing in group):
            return

        frontier[group_key] = [
            existing
            for existing in group
            if not set(existing["route_names"]) < station_set
        ]
        frontier[group_key].append(route)
