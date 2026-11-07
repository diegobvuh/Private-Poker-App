"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type View = "table" | "ledger" | "practice" | "security";
type Player = { id: string; name: string; initials: string; seat: number; stack: number; buyIn: number; status: "ACTIVE" | "AWAY" | "OUT" };
type LedgerRow = { id: string; player: string; type: string; amount: number; at: string; note?: string };
type DealerApplication = { id: string; status?: "PENDING" | "APPROVED" | "REJECTED"; email?: string; display_name?: string; note?: string | null; applied_at?: string };
type Modal = "join" | "buyin" | "cashout" | "settings" | "game" | null;

const initialPlayers: Player[] = [
  { id: "p1", name: "Diego", initials: "DB", seat: 1, stack: 246.5, buyIn: 200, status: "ACTIVE" },
  { id: "p2", name: "Maya", initials: "MR", seat: 2, stack: 184, buyIn: 200, status: "ACTIVE" },
  { id: "p3", name: "Noah", initials: "NC", seat: 3, stack: 311.25, buyIn: 300, status: "ACTIVE" },
  { id: "p4", name: "Lena", initials: "LP", seat: 5, stack: 158.25, buyIn: 200, status: "ACTIVE" },
];

const initialLedger: LedgerRow[] = [
  { id: "l4", player: "Noah", type: "Rebuy", amount: 100, at: "9:14 PM" },
  { id: "l3", player: "Lena", type: "Buy-in", amount: 200, at: "8:08 PM" },
  { id: "l2", player: "Maya", type: "Buy-in", amount: 200, at: "8:05 PM" },
  { id: "l1", player: "Diego", type: "Buy-in", amount: 200, at: "8:02 PM" },
];

const practiceGames = [
  { id: "holdem", name: "Hold’em", subtitle: "6 seats · No limit", accent: "♠", status: "2 waiting" },
  { id: "blackjack", name: "Blackjack", subtitle: "Classic · Dealer stands 17", accent: "21", status: "Solo table" },
  { id: "speed", name: "Speed", subtitle: "Head to head · Real time", accent: "⚡", status: "Invite a friend" },
];

export function ClubCockpit({ mode, currentUser = "Diego", role = "owner" }: { mode: "demo" | "connected"; currentUser?: string; role?: string }) {
  const [view, setView] = useState<View>("table");
  const [players, setPlayers] = useState(initialPlayers);
  const [ledger, setLedger] = useState(initialLedger);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedPlayer, setSelectedPlayer] = useState(initialPlayers[0].id);
  const [amount, setAmount] = useState("100");
  const [paused, setPaused] = useState(false);
  const [hand, setHand] = useState(14);
  const [pot, setPot] = useState(42.5);
  const [pendingJoin, setPendingJoin] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [gameName, setGameName] = useState("Friday Night Hold’em");
  const [stakes, setStakes] = useState("$0.50 / $1.00");
  const [practiceGame, setPracticeGame] = useState(practiceGames[0]);
  const [dealerApplications, setDealerApplications] = useState<DealerApplication[]>([]);
  const [myDealerApplication, setMyDealerApplication] = useState<DealerApplication | null>(null);
  const [dealerBusy, setDealerBusy] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (mode !== "connected") return;
    let cancelled = false;
    fetch("/api/dealer-applications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load dealer applications");
        return response.json() as Promise<{ applications?: DealerApplication[]; application?: DealerApplication | null }>;
      })
      .then((result) => {
        if (cancelled) return;
        setDealerApplications(result.applications ?? []);
        setMyDealerApplication(result.application ?? null);
      })
      .catch(() => { if (!cancelled) setToast("Dealer applications could not be loaded"); });
    return () => { cancelled = true; };
  }, [mode, role]);

  const totalInPlay = useMemo(() => players.reduce((sum, player) => sum + player.stack, 0), [players]);
  const totalBought = useMemo(() => players.reduce((sum, player) => sum + player.buyIn, 0), [players]);
  const qrValue = `https://house-rules.local/join?slot=${Math.floor(now / 120_000)}`;

  function addLedger(type: string, signedAmount: number) {
    const player = players.find((item) => item.id === selectedPlayer);
    if (!player || !Number.isFinite(signedAmount) || signedAmount <= 0) return;
    setPlayers((current) => current.map((item) => item.id === player.id ? {
      ...item,
      stack: Math.max(0, item.stack + (type === "Cash-out" ? -signedAmount : signedAmount)),
      buyIn: type === "Cash-out" ? item.buyIn : item.buyIn + signedAmount,
      status: type === "Cash-out" ? "OUT" : "ACTIVE",
    } : item));
    setLedger((current) => [{ id: crypto.randomUUID(), player: player.name, type, amount: type === "Cash-out" ? -signedAmount : signedAmount, at: "Just now" }, ...current]);
    setModal(null);
    setToast(`${type} recorded for ${player.name}`);
  }

  function nextHand() {
    if (paused) { setToast("Resume the table before starting a hand"); return; }
    setHand((value) => value + 1);
    setPot(0);
    setToast("New hand opened · action moved clockwise");
  }

  function approveJoin() {
    setPendingJoin(false);
    setPlayers((current) => [...current, { id: "p5", name: "Andre", initials: "AK", seat: 4, stack: 0, buyIn: 0, status: "AWAY" }]);
    setToast("Andre approved · Seat 4 reserved");
  }

  async function submitDealerAction(action: "apply" | "approve" | "reject", applicationId?: string, note = "") {
    setDealerBusy(applicationId ?? "apply");
    try {
      const response = await fetch("/api/dealer-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "apply" ? { action, note } : { action, applicationId }),
      });
      if (!response.ok) throw new Error("Request failed");
      const result = await response.json() as { application: DealerApplication };
      if (action === "apply") setMyDealerApplication(result.application);
      else setDealerApplications((current) => current.filter((item) => item.id !== applicationId));
      setToast(action === "apply" ? "Dealer application sent" : action === "approve" ? "Dealer access approved" : "Dealer application declined");
    } catch {
      setToast("That dealer request could not be updated");
    } finally {
      setDealerBusy(null);
    }
  }

  return (
    <main className="cockpit-shell">
      {mode === "demo" ? <div className="demo-ribbon"><strong>INTERACTIVE DEMO</strong><span>Changes stay on this device and never represent real funds.</span><Link href="/sign-in">Member sign in</Link></div> : null}
      <aside className="sidebar">
        <Link href="/" className="brand sidebar-brand"><span className="brand-mark">HR</span><span>HOUSE RULES</span></Link>
        <div className="club-identity">
          <span className="club-monogram">F</span>
          <div><strong>Friday Night</strong><span>Private home table</span></div>
        </div>
        <nav className="side-nav" aria-label="Club navigation">
          <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}><span>◉</span> Live table <i>LIVE</i></button>
          <button className={view === "ledger" ? "active" : ""} onClick={() => setView("ledger")}><span>≡</span> Money ledger</button>
          <button className={view === "practice" ? "active" : ""} onClick={() => setView("practice")}><span>♠</span> Practice room</button>
          <button className={view === "security" ? "active" : ""} onClick={() => setView("security")}><span>◇</span> Audit & safety</button>
        </nav>
        <div className="sidebar-bottom">
          <button className="profile-button" onClick={() => setModal("settings")}>
            <span className="avatar">{currentUser.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            <span><strong>{currentUser}</strong><small>{role.toUpperCase()} · HOST</small></span><b>•••</b>
          </button>
        </div>
      </aside>

      <section className="cockpit-main">
        <header className="topbar">
          <div><span className="topbar-label">HOUSE TABLE / </span><strong>{gameName}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Open game settings" onClick={() => setModal("settings")}>⚙</button>
            <button className="button compact button-ghost" onClick={() => setModal("join")}><span className="qr-mini">▦</span> Join table</button>
            <button className="button compact button-primary" onClick={nextHand}>New hand <span>→</span></button>
          </div>
        </header>

        {view === "table" ? (
          <div className="view-wrap">
            <section className="status-strip">
              <div><span className={`status-light ${paused ? "amber" : ""}`} /><small>TABLE STATUS</small><strong>{paused ? "PAUSED" : "LIVE"}</strong></div>
              <div><small>HAND</small><strong>#{hand}</strong></div>
              <div><small>BLINDS</small><strong>{stakes}</strong></div>
              <div><small>IN PLAY</small><strong>${totalInPlay.toFixed(2)}</strong></div>
              <div><small>HOUSE CUT</small><strong className="safe-value">$0.00</strong></div>
              <button className="pause-button" onClick={() => { setPaused(!paused); setToast(paused ? "Table resumed" : "Table paused"); }}>{paused ? "▶ RESUME" : "Ⅱ PAUSE"}</button>
            </section>

            <div className="table-layout">
              <section className="poker-stage" aria-label="Live poker table">
                <div className="table-heading"><div><span className="kicker">LIVE POSITION</span><h1>Table view</h1></div><span className="last-sync"><i /> Synced now</span></div>
                <div className="poker-table">
                  <div className="felt-rim">
                    <div className="felt-center">
                      <span className="pot-label">CURRENT POT</span><strong>${pot.toFixed(2)}</strong>
                      <div className="community-cards" aria-label="Community cards"><span>Q<span>♥</span></span><span>8<em>♣</em></span><span>8<span>♦</span></span><span>3<em>♠</em></span><i /></div>
                      <small>TURN · 3 PLAYERS</small>
                    </div>
                  </div>
                  {players.slice(0, 6).map((player, index) => (
                    <button key={player.id} className={`seat seat-${index + 1} ${player.status === "OUT" ? "out" : ""}`} onClick={() => { setSelectedPlayer(player.id); setModal("buyin"); }}>
                      <span className="seat-avatar">{player.initials}</span>
                      <span className="seat-copy"><b>{player.name}</b><strong>${player.stack.toFixed(2)}</strong></span>
                      {index === 0 ? <i className="dealer-chip">D</i> : null}
                    </button>
                  ))}
                  {[4, 5].filter((seat) => !players.some((player) => player.seat === seat)).map((seat, index) => <button className={`empty-seat empty-${index + 1}`} key={seat} onClick={() => setModal("join")}>+<span>SEAT {seat}</span></button>)}
                </div>
                <div className="table-actions">
                  <button onClick={() => setModal("buyin")}><span>＋</span><strong>Buy-in / rebuy</strong><small>Add chips with a ledger entry</small></button>
                  <button onClick={() => { setPot((value) => value + 12); setToast("Checkpoint saved · pot updated"); }}><span>⌁</span><strong>Checkpoint</strong><small>Record stacks without settling</small></button>
                  <button onClick={() => setModal("cashout")}><span>↗</span><strong>Cash out</strong><small>Close a player’s session</small></button>
                </div>
              </section>

              <aside className="right-rail">
                {mode === "demo" && pendingJoin ? <section className="panel join-request"><div className="panel-title"><span className="status-light amber" /><strong>JOIN REQUEST</strong><small>NOW</small></div><div className="request-person"><span className="avatar gold">AK</span><div><strong>Andre Kim</strong><span>Scanned the table code</span></div></div><div className="request-actions"><button onClick={approveJoin}>Approve</button><button onClick={() => { setPendingJoin(false); setToast("Join request declined"); }}>Decline</button></div></section> : null}
                <section className="panel snapshot">
                  <div className="panel-title"><strong>TABLE SNAPSHOT</strong><small>LIVE</small></div>
                  <div className="metric"><span>Total bought in</span><strong>${totalBought.toFixed(2)}</strong></div>
                  <div className="metric"><span>Stacks + current pot</span><strong>${(totalInPlay + pot).toFixed(2)}</strong></div>
                  <div className="metric"><span>Difference</span><strong className={Math.abs(totalBought - totalInPlay - pot) < 0.01 ? "safe-value" : "warn-value"}>${(totalBought - totalInPlay - pot).toFixed(2)}</strong></div>
                  <p className="metric-note">The difference is expected during live hands. Checkpoints preserve a reviewable trail.</p>
                </section>
                <section className="panel activity">
                  <div className="panel-title"><strong>RECENT ACTIVITY</strong><button onClick={() => setView("ledger")}>View ledger</button></div>
                  {ledger.slice(0, 4).map((entry) => <div className="activity-row" key={entry.id}><span className={entry.amount < 0 ? "down" : "up"}>{entry.amount < 0 ? "↗" : "+"}</span><div><strong>{entry.player} · {entry.type}</strong><small>{entry.at}</small></div><b>{entry.amount < 0 ? "−" : "+"}${Math.abs(entry.amount).toFixed(2)}</b></div>)}
                </section>
              </aside>
            </div>
          </div>
        ) : null}

        {view === "ledger" ? <LedgerView ledger={ledger} total={totalBought} onCorrect={(entry) => { setSelectedPlayer(players.find((p) => p.name === entry.player)?.id ?? players[0].id); setModal("buyin"); setToast("Corrections create a new compensating entry"); }} /> : null}
        {view === "practice" ? <PracticeView onOpen={(game) => { setPracticeGame(game); setModal("game"); }} /> : null}
        {view === "security" ? <SecurityView mode={mode} /> : null}
      </section>

      {modal ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" onClick={() => setModal(null)} aria-label="Close dialog">×</button>
          {modal === "join" ? <JoinModal value={qrValue} pending={pendingJoin} /> : null}
          {modal === "buyin" || modal === "cashout" ? <MoneyModal kind={modal} players={players} selected={selectedPlayer} amount={amount} setSelected={setSelectedPlayer} setAmount={setAmount} onSave={() => addLedger(modal === "buyin" ? (players.find((p) => p.id === selectedPlayer)?.buyIn ? "Rebuy" : "Buy-in") : "Cash-out", Number(amount))} /> : null}
          {modal === "settings" ? <SettingsModal role={role} gameName={gameName} stakes={stakes} setGameName={setGameName} setStakes={setStakes} applications={dealerApplications} myApplication={myDealerApplication} busy={dealerBusy} onDealerAction={submitDealerAction} onSave={() => { setModal(null); setToast("Table settings updated"); }} /> : null}
          {modal === "game" ? <PracticeModal game={practiceGame} onPlay={() => setToast(`${practiceGame.name} practice table created`)} /> : null}
        </section>
      </div> : null}
      {toast ? <div className="toast" role="status"><span>✓</span>{toast}</div> : null}
    </main>
  );
}

function LedgerView({ ledger, total, onCorrect }: { ledger: LedgerRow[]; total: number; onCorrect: (entry: LedgerRow) => void }) {
  return <div className="content-view"><div className="content-heading"><div><span className="kicker">IMMUTABLE ACCOUNTING</span><h1>Money ledger</h1><p>Every change is a new entry. History is never silently rewritten.</p></div><div className="heading-metric"><small>TOTAL BUY-INS</small><strong>${total.toFixed(2)}</strong></div></div><section className="ledger-card"><div className="ledger-head"><span>PLAYER</span><span>EVENT</span><span>RECORDED</span><span>AMOUNT</span><span>ACTION</span></div>{ledger.map((entry) => <div className="ledger-line" key={entry.id}><strong>{entry.player}</strong><span className="event-pill">{entry.type}</span><span>{entry.at}</span><b className={entry.amount < 0 ? "negative" : "positive"}>{entry.amount < 0 ? "−" : "+"}${Math.abs(entry.amount).toFixed(2)}</b><button onClick={() => onCorrect(entry)}>Correct</button></div>)}</section><div className="namespace-grid"><article><span className="namespace-code">01</span><h2>Real value</h2><p>Tracks physical money held by the dealer. Never transferable online.</p><strong>IRL_REAL_VALUE</strong></article><article><span className="namespace-code">02</span><h2>Practice chips</h2><p>Nonredeemable chips for online games and learning tables.</p><strong>PRACTICE_CHIPS</strong></article><article><span className="namespace-code">03</span><h2>Fractional carry</h2><p>Sub-cent remainders carried forward until a future settlement.</p><strong>FRACTIONAL_REMAINDER</strong></article></div></div>;
}

function PracticeView({ onOpen }: { onOpen: (game: typeof practiceGames[number]) => void }) {
  return <div className="content-view"><div className="content-heading"><div><span className="kicker">ZERO CASH VALUE</span><h1>Practice room</h1><p>Play between game nights. Practice chips can never become money.</p></div><div className="practice-balance"><small>PRACTICE BALANCE</small><strong>25,000</strong><span>NONREDEEMABLE</span></div></div><div className="game-grid">{practiceGames.map((game) => <button className="game-card" key={game.id} onClick={() => onOpen(game)}><span className="game-art">{game.accent}</span><div><span className="status-light" /><small>{game.status}</small><h2>{game.name}</h2><p>{game.subtitle}</p><strong>Open table <span>→</span></strong></div></button>)}</div><section className="fairness-card"><div><span className="kicker">PROVABLY REVIEWABLE</span><h2>Every shuffle leaves a receipt.</h2></div><p>The server commits to a secret seed before dealing. After the game, the seed is revealed so the deck order can be independently verified.</p><span className="hash-block">SHA-256&nbsp;&nbsp; 84c2…e91b</span></section></div>;
}

function SecurityView({ mode }: { mode: string }) {
  const controls = [
    ["Dealer-approved privileges", "Active", "Every signup starts as a player. Existing dealers approve all dealer promotions."],
    ["Row-level security", mode === "connected" ? "Connected" : "Migration ready", "Club membership and role checks are enforced in Postgres."],
    ["Immutable ledger", "Active", "Updates and deletes are blocked; corrections use compensating entries."],
    ["No online cash", "Enforced", "Practice and real-value namespaces cannot be converted."],
    ["Camera access", "Disabled", "The v1 permissions policy blocks camera and microphone access."],
  ];
  return <div className="content-view"><div className="content-heading"><div><span className="kicker">TRUST, MADE VISIBLE</span><h1>Audit & safety</h1><p>Security posture for this private household club.</p></div><span className="security-score">5 / 5<br/><small>CORE CONTROLS</small></span></div><section className="control-list">{controls.map(([name, status, detail], index) => <article key={name}><span className="control-number">0{index + 1}</span><div><h2>{name}</h2><p>{detail}</p></div><strong><i />{status}</strong></article>)}</section><div className="boundary-card"><span>LEGAL-FIRST BOUNDARY</span><p>This tool records a private no-rake home game. It does not custody money, process payments, verify transfers, or allow practice chips to be redeemed.</p></div></div>;
}

function JoinModal({ value, pending }: { value: string; pending: boolean }) {
  return <><span className="kicker">ROTATES EVERY 2 MINUTES</span><h2 id="modal-title">Join this table</h2><p>Members scan this code in the room. A dealer must still approve every seat.</p><div className="qr-wrap"><QRCodeSVG value={value} size={210} bgColor="#f4f0df" fgColor="#07110e" level="H" /><span>HOUSE RULES</span></div><div className="modal-status"><span className="status-light" />{pending ? "1 request waiting for approval" : "Code is active · no requests waiting"}</div></>;
}

function MoneyModal({ kind, players, selected, amount, setSelected, setAmount, onSave }: { kind: "buyin" | "cashout"; players: Player[]; selected: string; amount: string; setSelected: (value: string) => void; setAmount: (value: string) => void; onSave: () => void }) {
  return <><span className="kicker">{kind === "buyin" ? "APPEND LEDGER ENTRY" : "WHOLE-CENT SETTLEMENT"}</span><h2 id="modal-title">{kind === "buyin" ? "Buy-in or rebuy" : "Cash out player"}</h2><p>{kind === "buyin" ? "Physical money stays with the dealer. This records the table value only." : "The player’s fractional remainder stays on their club account."}</p><div className="field"><label htmlFor="player">Player</label><select id="player" value={selected} onChange={(e) => setSelected(e.target.value)}>{players.map((player) => <option value={player.id} key={player.id}>{player.name} · ${player.stack.toFixed(2)}</option>)}</select></div><div className="field"><label htmlFor="amount">Amount in dollars</label><div className="money-input"><span>$</span><input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div></div><div className="quick-amounts">{[20, 50, 100, 200].map((value) => <button key={value} onClick={() => setAmount(String(value))}>${value}</button>)}</div><button className="button button-primary full" onClick={onSave}>Record {kind === "buyin" ? "entry" : "cash-out"}</button></>;
}

function SettingsModal({ role, gameName, stakes, setGameName, setStakes, applications, myApplication, busy, onDealerAction, onSave }: { role: string; gameName: string; stakes: string; setGameName: (value: string) => void; setStakes: (value: string) => void; applications: DealerApplication[]; myApplication: DealerApplication | null; busy: string | null; onDealerAction: (action: "apply" | "approve" | "reject", applicationId?: string, note?: string) => Promise<void>; onSave: () => void }) {
  const [dealerNote, setDealerNote] = useState("");
  const canReview = role === "owner" || role === "dealer";
  if (!canReview) {
    return <><span className="kicker">ACCOUNT SETTINGS</span><h2 id="modal-title">Player access</h2><p>Every new account starts as a player. Dealer access requires approval from an existing dealer.</p><div className="role-card"><span>CURRENT ROLE</span><strong>PLAYER</strong></div>{myApplication?.status === "PENDING" ? <div className="notice success" role="status">Your dealer application is waiting for review.</div> : <><div className="field"><label htmlFor="dealer-note">Why do you want dealer access? <small>Optional</small></label><textarea id="dealer-note" value={dealerNote} maxLength={240} onChange={(event) => setDealerNote(event.target.value)} placeholder="I’ll help host and settle game night…" /></div><button className="button button-primary full" disabled={busy === "apply"} onClick={() => onDealerAction("apply", undefined, dealerNote)}>Apply to become a dealer</button>{myApplication?.status === "REJECTED" ? <p className="field-hint">Your previous application was declined. You may submit a new one.</p> : null}</>}</>;
  }
  return <><span className="kicker">DEALER CONTROLS</span><h2 id="modal-title">Table settings</h2><p>Only existing dealers can approve another dealer.</p>{applications.length ? <section className="dealer-application-list"><strong>PENDING DEALER APPLICATIONS</strong>{applications.map((application) => <article key={application.id}><div><b>{application.display_name}</b><span>{application.email}</span>{application.note ? <p>{application.note}</p> : null}</div><div><button disabled={busy === application.id} onClick={() => onDealerAction("approve", application.id)}>Approve</button><button disabled={busy === application.id} onClick={() => onDealerAction("reject", application.id)}>Decline</button></div></article>)}</section> : <div className="notice success">No dealer applications are waiting.</div>}<div className="field"><label htmlFor="game-name">Game name</label><input id="game-name" value={gameName} onChange={(e) => setGameName(e.target.value.slice(0, 48))} /></div><div className="field"><label htmlFor="stakes">Blinds</label><select id="stakes" value={stakes} onChange={(e) => setStakes(e.target.value)}><option>$0.25 / $0.50</option><option>$0.50 / $1.00</option><option>$1.00 / $2.00</option></select></div><button className="button button-primary full" onClick={onSave}>Save settings</button></>;
}

function PracticeModal({ game, onPlay }: { game: typeof practiceGames[number]; onPlay: () => void }) {
  const [joined, setJoined] = useState(false);
  const [round, setRound] = useState(0);
  const [blackjack, setBlackjack] = useState(["A♠", "6♦"]);
  const [speedPile, setSpeedPile] = useState(7);
  const [message, setMessage] = useState("Waiting for your first move");
  function play() {
    if (!joined) { setJoined(true); onPlay(); return; }
    setRound((value) => value + 1);
    if (game.id === "blackjack") {
      const next = ["2♣", "4♥", "10♠", "K♦"][round % 4];
      setBlackjack((cards) => [...cards, next]);
      setMessage(`Drew ${next} · choose hit or stand`);
    } else if (game.id === "speed") {
      setSpeedPile((value) => value === 13 ? 1 : value + 1);
      setMessage("Valid adjacent card played · opponent clock running");
    } else {
      setMessage(round === 0 ? "Flop dealt · your action" : round === 1 ? "Turn dealt · opponent checked" : "New practice hand shuffled");
    }
  }
  const cards = game.id === "blackjack" ? blackjack : game.id === "speed" ? [`${speedPile}♣`, `${speedPile === 13 ? 1 : speedPile + 1}♥`] : ["A♠", "K♠", "·", "Q♠", "J♦", "8♣"];
  return <><span className="kicker">PRACTICE CHIPS ONLY</span><h2 id="modal-title">{game.name}</h2><p>{game.subtitle}. This table has no cash value and cannot be settled for money.</p><div className="practice-preview"><span>{game.accent}</span><div><strong>{joined ? "Table ready" : game.status}</strong><small>{joined ? message : "Private household lobby"}</small></div></div>{joined ? <div className="mini-hand" aria-label="Practice cards">{cards.map((card, index) => <span key={`${card}-${index}`}>{card}</span>)}</div> : null}<button className="button button-primary full" onClick={play}>{joined ? (game.id === "blackjack" ? "Hit" : game.id === "speed" ? "Play adjacent card" : "Deal next street") : "Join practice table"}</button>{joined && game.id === "blackjack" ? <button className="button button-ghost full practice-secondary" onClick={() => setMessage("Stood · dealer completed the hand")}>Stand</button> : null}</>;
}
