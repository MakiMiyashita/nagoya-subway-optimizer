import { useState } from 'react';

interface Props {
  onClose: () => void;
}

const pages = [
  {
    title: '欲しい駅から定期券を探す',
    body: '始発と終着を先に決めなくても大丈夫．通いたい駅，寄りたい駅を地図から選べる．',
    mark: '◎',
  },
  {
    title: '駅の役割を使い分ける',
    body: '必ず通る駅，できれば通る駅，通らない駅を色分けして指定する．端にしたい駅だけ始発・終着にする．',
    mark: '◇',
  },
  {
    title: '候補を比べて調整する',
    body: '希望の達成数，料金区，駅数で候補を比較できる．カードを選ぶと経路が地図に表示される．',
    mark: '↗',
  },
];

export function Onboarding({ onClose }: Props) {
  const [page, setPage] = useState(0);
  const item = pages[page];

  return (
    <div className="onboarding-backdrop" role="presentation">
      <section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button className="text-button onboarding-skip" onClick={onClose}>スキップ</button>
        <div className="onboarding-mark" aria-hidden="true">{item.mark}</div>
        <p className="eyebrow">はじめに</p>
        <h2 id="onboarding-title">{item.title}</h2>
        <p>{item.body}</p>
        <div className="onboarding-footer">
          <div className="page-dots" aria-label={`${page + 1} / ${pages.length}ページ`}>
            {pages.map((_, index) => <span key={index} className={index === page ? 'active' : ''} />)}
          </div>
          <button className="primary-button" onClick={() => page === pages.length - 1 ? onClose() : setPage(page + 1)}>
            {page === pages.length - 1 ? '使ってみる' : '次へ'}
          </button>
        </div>
      </section>
    </div>
  );
}
