import {
  MY_ACTIVE_BIDS_PATH,
  MY_BIDS_HISTORY_PATH,
  mapBidsList,
} from '../src/common/bff/bids-view';

describe('bids-view (PT-059 / BUG-QA-N02)', () => {
  it('B1: usa los endpoints reales my-active / my-history', () => {
    expect(MY_ACTIVE_BIDS_PATH).toBe('/api/v1/bids/my-active');
    expect(MY_BIDS_HISTORY_PATH).toBe('/api/v1/bids/my-history');
  });

  it('B2: envuelve el array en {items} y deriva isWinning=true cuando amount === currentPrice', () => {
    const out = mapBidsList([
      { amount: 700, auctionId: 'a1', auction: { title: 'Reloj', currentPrice: 700 } } as any,
    ]);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].isWinning).toBe(true);
    expect(out.items[0].auction.title).toBe('Reloj');
  });

  it('B3: isWinning=false cuando amount < currentPrice', () => {
    const out = mapBidsList([
      { amount: 600, auctionId: 'a1', auction: { currentPrice: 700 } } as any,
    ]);
    expect(out.items[0].isWinning).toBe(false);
  });

  it('B4: null/undefined → {items: []}', () => {
    expect(mapBidsList(null)).toEqual({ items: [] });
    expect(mapBidsList(undefined)).toEqual({ items: [] });
  });
});
