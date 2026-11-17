// A faithful BigInt port of UnitVault's mint/redeem/flash/agent math, for the simulator.
// Cross-checked against the Solidity contracts on the EVM in test/09_port.test.js.
(function (root) {
  const E18 = 10n ** 18n, BPS = 10000n, FEE = 10n, MIN_UNITS = 10n ** 16n;
  const ceil = (a, b) => (a === 0n ? 0n : (a - 1n) / b + 1n);

  const LAUNCH_V06 = [
    { key: 'GOLD', name: 'Gold', unit: 'oz', q: 8_680_700_000_000_000n, px: 4074.8999, color: '#D9A800', subs: [
      { sym: 'XAUT', dec: 6, rate: E18, cap: 7000, hc: 2500, split: 0.5 }, { sym: 'PAXG', dec: 18, rate: E18, cap: 7000, hc: 2500, split: 0.5 }] },
    { key: 'SPX', name: 'S&P 500', unit: 'share', q: 27n * 10n ** 15n, px: 735.29, color: '#C91A09', subs: [
      { sym: 'SPYx', dec: 18, rate: E18, cap: 7000, hc: 5000, split: 0.5 }, { sym: 'SPYon', dec: 18, rate: E18, cap: 7000, hc: 5000, split: 0.5 }] },
    { key: 'RE', name: 'Real estate', unit: 'share', q: 157n * 10n ** 15n, px: 95.73, color: '#A95500', subs: [
      { sym: 'VNQon', dec: 18, rate: E18, cap: 10000, hc: 7500, split: 1 }] },
    { key: 'BTC', name: 'Bitcoin', unit: 'BTC', q: 13n * 10n ** 13n, px: 75736.39, color: '#FE8A18', subs: [
      { sym: 'cbBTC', dec: 8, rate: E18, cap: 6000, hc: 2500, split: 0.5 }, { sym: 'WBTC', dec: 8, rate: E18, cap: 5000, hc: 5000, split: 0.3 },
      { sym: 'tBTC', dec: 18, rate: E18, cap: 3000, hc: 5000, split: 0.2 }] },
    { key: 'ETH', name: 'Ether', unit: 'ETH', q: 45n * 10n ** 14n, px: 2231.71, color: '#5A3E9E', subs: [
      { sym: 'WETH', dec: 18, rate: E18, cap: 10000, hc: 0, split: 0.2 }, { sym: 'wstETH', dec: 18, rate: 1_210_000_000_000_000_000n, cap: 8500, hc: 5000, split: 0.6 },
      { sym: 'rETH', dec: 18, rate: 1_140_000_000_000_000_000n, cap: 4000, hc: 5000, split: 0.2 }] },
    { key: 'SAV', name: 'Dollar savings', unit: 'USDS', q: 986n * 10n ** 16n, px: 1, color: '#4B9F4A', subs: [
      { sym: 'sUSDS', dec: 18, rate: 1_080_000_000_000_000_000n, cap: 10000, hc: 1000, split: 1 }, { sym: 'sDAI', dec: 18, rate: 1_180_000_000_000_000_000n, cap: 5000, hc: 1000, split: 0 },
      { sym: 'USDS', dec: 18, rate: E18, cap: 3000, hc: 0, split: 0 }] },
  ];

  // v1 live launch: one issuer per leg, caps 100%
  const pick = (key, sym) => { const l = LAUNCH_V06.find(x => x.key === key); return { ...l, subs: [{ ...l.subs.find(s => s.sym === sym), cap: 10000, split: 1 }] }; };
  const LAUNCH_V1 = [pick('GOLD', 'PAXG'), pick('SPX', 'SPYx'), pick('RE', 'VNQon'), pick('BTC', 'cbBTC'), pick('ETH', 'WETH'), pick('SAV', 'sUSDS')];
  const LAUNCH = LAUNCH_V1;

  class VaultSim {
    constructor(legs = LAUNCH) {
      this.legs = legs.map(l => ({ ...l, subs: l.subs.map(s => ({ ...s, dec: BigInt(s.dec), paused: false, frozen: false })) }));
      this.held = {}; this.claims = {}; this.supply = 0n;
      this.sub = {}; for (const l of this.legs) for (const s of l.subs) { this.held[s.sym] = 0n; this.claims[s.sym] = 0n; this.sub[s.sym] = { ...s, leg: l }; }
    }
    toU(sym, amt) { const s = this.sub[sym]; return amt * s.rate / 10n ** s.dec; }
    fromUUp(sym, u) { const s = this.sub[sym]; return u === 0n ? 0n : ceil(u * 10n ** s.dec, s.rate); }
    legValue(l) { return l.subs.reduce((t, s) => t + this.toU(s.sym, this.held[s.sym]), 0n); }
    required(l, S = this.supply) { return ceil(l.q * S, E18); }
    mintNeed(l, u) { return ceil(l.q * u * (BPS + FEE), E18 * BPS); }
    coverageBps(l) { const r = this.required(l); return r === 0n ? null : Number(this.legValue(l) * BPS / r); }
    checkInvariant() { for (const l of this.legs) if (this.legValue(l) < this.required(l)) throw new Error('Undercollateralized(' + l.key + ')'); }
    _syncSubs() { for (const l of this.legs) for (const s of l.subs) Object.assign(s, { rate: this.sub[s.sym].rate, paused: this.sub[s.sym].paused, frozen: this.sub[s.sym].frozen, hc: this.sub[s.sym].hc }); }
    setRate(sym, r) { this.sub[sym].rate = r; this._syncSubs(); }

    /** Basket for `units` following each sub's split (same rule as the test fixture). */
    basket(units, split) {
      const out = [];
      for (const l of this.legs) {
        const need = this.mintNeed(l, units);
        const subs = l.subs.filter(s => !this.sub[s.sym].paused && ((split ? split[s.sym] : s.split) || 0) > 0);
        if (!subs.length) throw new Error('IntakeIsPaused(' + l.key + ')');
        let assigned = 0n;
        subs.forEach((s, i) => {
          const w = split ? split[s.sym] : s.split;
          const part = i === subs.length - 1 ? need - assigned : need * BigInt(Math.round(w * 1e6)) / 1_000_000n;
          assigned += part;
          out.push({ sym: s.sym, leg: l.key, under: part, amount: this.fromUUp(s.sym, part) });
        });
      }
      return out;
    }

    mint(units, items) {
      if (units < MIN_UNITS) throw new Error('TooSmall');
      const snap = JSON.stringify([this.held, this.supply.toString()], (k, v) => typeof v === 'bigint' ? v.toString() : v);
      try {
        const delivered = {};
        for (const it of items) {
          const s = this.sub[it.sym]; if (!s) throw new Error('UnknownSubstitute'); if (s.paused) throw new Error('IntakeIsPaused');
          this.held[it.sym] += it.amount; delivered[s.leg.key] = (delivered[s.leg.key] || 0n) + this.toU(it.sym, it.amount);
        }
        const rows = this.legs.map(l => ({ leg: l.key, need: this.mintNeed(l, units), got: delivered[l.key] || 0n }));
        for (const r of rows) if (r.got < r.need) throw new Error('InsufficientLeg(' + r.leg + ')');
        for (const it of items) this._cap(it.sym);
        this.supply += units; this.checkInvariant();
        return { units, rows };
      } catch (e) { this._restore(snap); throw e; }
    }

    redeem(units) {
      if (units < MIN_UNITS) throw new Error('TooSmall');
      if (units > this.supply) throw new Error('Insufficient');
      this.supply -= units;
      const paid = [];
      for (const l of this.legs) {
        const outU = l.q * units * (BPS - FEE) / (E18 * BPS), lv = this.legValue(l);
        for (const s of l.subs) {
          if (lv > 0n && this.held[s.sym] > 0n) {
            const amt = this.held[s.sym] * outU / lv; this.held[s.sym] -= amt;
            const frozen = this.sub[s.sym].frozen;
            if (frozen) this.claims[s.sym] += amt;
            paid.push({ sym: s.sym, leg: l.key, amount: amt, under: this.toU(s.sym, amt), claim: frozen });
          }
        }
      }
      this.checkInvariant();
      return { units, paid };
    }

    /** Agent move inside one leg. role: 'sentinel' | 'rebalancer'. Budget windows are tracked by the caller. */
    shift(legKey, from, amountOut, to, amountIn, role) {
      const f = this.sub[from], t = this.sub[to];
      if (!f || !t || f.leg.key !== legKey || t.leg.key !== legKey || from === to) throw new Error('WrongLeg');
      if (t.paused) throw new Error('IntakeIsPaused');
      if (role === 'sentinel' && !f.paused) throw new Error('NotShrinkOnly');
      const vOut = this.toU(from, amountOut), vIn = this.toU(to, amountIn), loss = role === 'sentinel' ? 50n : 10n;
      if (vIn * BPS < vOut * (BPS - loss)) throw new Error('ExcessLoss');
      const snap = JSON.stringify([this.held, this.supply.toString()], (k, v) => typeof v === 'bigint' ? v.toString() : v);
      try { this.held[to] += amountIn; this.held[from] -= amountOut; this._cap(to); this.checkInvariant(); }
      catch (e) { this._restore(snap); throw e; }
      return { vOut, vIn };
    }
    flag(sym, hc) { const s = this.sub[sym]; s.paused = true; if (hc > s.hc) s.hc = hc; this._syncSubs(); }
    topUp(sym, amount) { this.held[sym] += amount; }

    _cap(sym) {
      const s = this.sub[sym], lv = this.legValue(s.leg);
      if (lv > 0n && this.toU(sym, this.held[sym]) * BPS > lv * BigInt(s.cap)) throw new Error('CapExceeded(' + sym + ')');
    }
    _restore(snap) { const [h, sup] = JSON.parse(snap); for (const k in h) this.held[k] = BigInt(h[k]); this.supply = BigInt(sup); }

    /** USD helpers (prices are display-only; nothing in the money path reads them). */
    navPerU() { return this.legs.reduce((t, l) => t + Number(l.q) / 1e18 * l.px, 0); }
    legUsd(l) { return Number(this.legValue(l)) / 1e18 * l.px; }
    /** v0.6 rule: USD cost to mint `units` if backing counted after haircuts, at the given split. */
    haircutCost(units = 1) {
      return this.legs.reduce((t, l) => {
        const subs = l.subs.filter(s => s.split > 0);
        const eff = subs.reduce((a, s) => a + s.split * (1 - this.sub[s.sym].hc / 10000), 0) / subs.reduce((a, s) => a + s.split, 0);
        return t + Number(l.q) / 1e18 * l.px * units * 1.001 / eff;
      }, 0);
    }
  }

  const api = { VaultSim, LAUNCH, LAUNCH_V1, LAUNCH_V06, E18, ceil };
  if (typeof module !== 'undefined') module.exports = api; else root.UnitVaultSim = api;
})(this);
