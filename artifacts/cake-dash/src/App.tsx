import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent } from 'react';

type GameStatus = 'ready' | 'running' | 'gameover';
type ObstacleKind = 'box' | 'bowl' | 'jar';

type Obstacle = {
  id: number;
  x: number;
  h: number;
  kind: ObstacleKind;
};

type Sprinkle = {
  id: number;
  x: number;
  y: number;
};

type Runtime = {
  playerY: number;
  velocity: number;
  distance: number;
  sprinkles: number;
  obstacles: Obstacle[];
  collectibles: Sprinkle[];
  lastTime: number;
  nextId: number;
};

type Snapshot = {
  playerY: number;
  velocity: number;
  distance: number;
  sprinkles: number;
  obstacles: Obstacle[];
  collectibles: Sprinkle[];
};

const FLOOR = 96;
const PLAYER_X = 150;
const PLAYER_WIDTH = 78;
const PLAYER_HEIGHT = 68;
const BEST_SCORE_KEY = 'cake-dash-best-score';

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const makeRuntime = (): Runtime => ({
  playerY: FLOOR,
  velocity: 0,
  distance: 0,
  sprinkles: 0,
  obstacles: [
    { id: 1, x: 760, h: 65, kind: 'box' },
    { id: 2, x: 1240, h: 82, kind: 'bowl' },
  ],
  collectibles: [
    { id: 3, x: 390, y: 220 },
    { id: 4, x: 485, y: 287 },
    { id: 5, x: 595, y: 210 },
    { id: 6, x: 895, y: 270 },
    { id: 7, x: 1005, y: 185 },
  ],
  lastTime: 0,
  nextId: 10,
});

function CakeSprite() {
  return (
    <svg viewBox="0 0 100 82" role="img" aria-label="A tiny strawberry layer cake">
      <g className="cake-frosting">
        <path d="M13 24c8-9 20-12 35-9 11-8 27-3 35 7l-6 12H18Z" fill="#f8d5c9" stroke="#2b2b43" strokeWidth="3" />
        <path d="M11 29c8 5 13-1 20 3 8 4 13-3 21 2 8 5 14-3 22 2 6 4 10 0 15-2v12H11Z" fill="#f27383" stroke="#2b2b43" strokeWidth="3" />
        <path d="M14 39h70v28H14Z" fill="#f6b9aa" stroke="#2b2b43" strokeWidth="3" />
        <path d="M14 51c8-5 13 5 21 0 8-5 14 5 22 0 8-5 14 5 27-1v13H14Z" fill="#fff0d6" stroke="#2b2b43" strokeWidth="2.5" />
        <path d="M18 67h62l-5 8H23Z" fill="#e85b72" stroke="#2b2b43" strokeWidth="3" />
        <path d="M21 37c4 3 6 3 9 0M39 37c4 3 6 3 9 0M57 37c4 3 6 3 9 0" fill="none" stroke="#fff0d6" strokeLinecap="round" strokeWidth="3" />
        <circle cx="53" cy="13" r="7" fill="#e85b72" stroke="#2b2b43" strokeWidth="3" />
        <path d="M50 7c1-5 7-6 10-5-1 5-4 7-8 7" fill="#72aa83" stroke="#2b2b43" strokeWidth="2" />
        <circle cx="32" cy="26" r="2.2" fill="#f5c84c" />
        <circle cx="69" cy="26" r="2.2" fill="#f5c84c" />
      </g>
      <path d="M28 77h8M65 77h8" stroke="#2b2b43" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function ObstacleArt({ kind }: { kind: ObstacleKind }) {
  return <div className={`obstacle-art obstacle-${kind === 'box' ? 'box' : kind}`} aria-hidden="true" />;
}

function SprinkleIcon() {
  return <span className="mini-sprinkle" aria-hidden="true" />;
}

function JumpArrow() {
  return (
    <svg aria-hidden="true" height="15" viewBox="0 0 18 18" width="15">
      <path d="M9 14V3M4.5 7.5 9 3l4.5 4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function Home() {
  const [status, setStatus] = useState<GameStatus>('ready');
  const [best, setBest] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
  });
  const [snapshot, setSnapshot] = useState<Snapshot>(() => {
    const runtime = makeRuntime();
    return {
      playerY: runtime.playerY,
      velocity: runtime.velocity,
      distance: runtime.distance,
      sprinkles: runtime.sprinkles,
      obstacles: runtime.obstacles,
      collectibles: runtime.collectibles,
    };
  });
  const runtime = useRef<Runtime>(makeRuntime());

  const finishGame = useCallback(() => {
    const score = Math.floor(runtime.current.distance);
    setBest((currentBest) => {
      const nextBest = Math.max(currentBest, score);
      window.localStorage.setItem(BEST_SCORE_KEY, String(nextBest));
      return nextBest;
    });
    setStatus('gameover');
  }, []);

  const startGame = useCallback(() => {
    runtime.current = makeRuntime();
    setSnapshot({
      playerY: FLOOR,
      velocity: 0,
      distance: 0,
      sprinkles: 0,
      obstacles: runtime.current.obstacles,
      collectibles: runtime.current.collectibles,
    });
    setStatus('running');
  }, []);

  const jump = useCallback(() => {
    if (status === 'ready' || status === 'gameover') {
      startGame();
      return;
    }
    if (runtime.current.playerY <= FLOOR + 1) {
      runtime.current.velocity = 640;
    }
  }, [startGame, status]);

  useEffect(() => {
    const onKeyDown = (event: ReactKeyboardEvent<Document> | KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'ArrowUp' && event.key.toLowerCase() !== 'w') return;
      event.preventDefault();
      jump();
    };
    window.addEventListener('keydown', onKeyDown as EventListener);
    return () => window.removeEventListener('keydown', onKeyDown as EventListener);
  }, [jump]);

  useEffect(() => {
    if (status !== 'running') return;
    let animationFrame = 0;
    const tick = (time: number) => {
      const game = runtime.current;
      const delta = Math.min((time - game.lastTime) / 1000, 0.032);
      game.lastTime = time;
      const speed = 260 + Math.min(game.distance * 0.22, 150);

      game.distance += speed * delta / 10;
      game.playerY += game.velocity * delta;
      game.velocity -= 1650 * delta;
      if (game.playerY <= FLOOR) {
        game.playerY = FLOOR;
        game.velocity = 0;
      }

      game.obstacles = game.obstacles
        .map((obstacle) => ({ ...obstacle, x: obstacle.x - speed * delta }))
        .filter((obstacle) => obstacle.x > -100);
      game.collectibles = game.collectibles
        .map((collectible) => ({ ...collectible, x: collectible.x - speed * delta }))
        .filter((collectible) => collectible.x > -80);

      const lastObstacle = game.obstacles[game.obstacles.length - 1];
      if (!lastObstacle || lastObstacle.x < 1160) {
        const kinds: ObstacleKind[] = ['box', 'bowl', 'jar'];
        game.obstacles.push({
          id: game.nextId++,
          x: (lastObstacle?.x ?? 980) + randomBetween(300, 475),
          h: randomBetween(54, 88),
          kind: kinds[randomBetween(0, kinds.length - 1)],
        });
      }

      const lastSprinkle = game.collectibles[game.collectibles.length - 1];
      if (!lastSprinkle || lastSprinkle.x < 1190) {
        const baseX = (lastSprinkle?.x ?? 800) + randomBetween(230, 340);
        game.collectibles.push(
          { id: game.nextId++, x: baseX, y: randomBetween(170, 300) },
          { id: game.nextId++, x: baseX + randomBetween(42, 78), y: randomBetween(205, 330) },
        );
      }

      const playerBox = {
        left: PLAYER_X - 5,
        right: PLAYER_X + PLAYER_WIDTH - 10,
        bottom: game.playerY + 5,
        top: game.playerY + PLAYER_HEIGHT,
      };
      const hitObstacle = game.obstacles.some((obstacle) => {
        const obstacleTop = FLOOR + obstacle.h;
        return playerBox.right > obstacle.x + 8
          && playerBox.left < obstacle.x + 66
          && playerBox.top > FLOOR + 2
          && playerBox.bottom < obstacleTop;
      });

      const remainingCollectibles: Sprinkle[] = [];
      for (const collectible of game.collectibles) {
        const closeX = collectible.x > playerBox.left - 10 && collectible.x < playerBox.right + 12;
        const closeY = collectible.y > game.playerY - 12 && collectible.y < game.playerY + PLAYER_HEIGHT + 18;
        if (closeX && closeY) {
          game.sprinkles += 1;
        } else {
          remainingCollectibles.push(collectible);
        }
      }
      game.collectibles = remainingCollectibles;

      setSnapshot({
        playerY: game.playerY,
        velocity: game.velocity,
        distance: game.distance,
        sprinkles: game.sprinkles,
        obstacles: [...game.obstacles],
        collectibles: [...game.collectibles],
      });

      if (hitObstacle) {
        finishGame();
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame((time) => {
      runtime.current.lastTime = time;
      tick(time);
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [finishGame, status]);

  const handleStagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    jump();
  };

  const score = Math.floor(snapshot.distance);
  const playerStyle: CSSProperties = {
    bottom: `${snapshot.playerY / 5}%`,
    transform: `rotate(${Math.max(-5, Math.min(5, snapshot.velocity / 125))}deg)`,
  };

  return (
    <main className="cake-app">
      <div className="app-frame">
        <header className="brand-row">
          <div className="brand-mark" data-testid="brand-cake-dash">
            <div className="brand-stamp">CD</div>
            <div>
              <div className="brand-name">Cake Dash</div>
              <div className="brand-kicker">counter sprint no. 01</div>
            </div>
          </div>
          <div className="top-note">
            <span className="live-dot" />
            bakery counter is open
          </div>
        </header>

        <div className="game-layout">
          <section className="game-card" aria-label="Cake Dash game">
            <div className="game-topbar">
              <div>
                <div className="game-title">The morning rush</div>
                <div className="game-subtitle">Keep the layers steady. Collect the good stuff.</div>
              </div>
              <div className="score-cluster">
                <div className="score-block">
                  <span className="score-label">distance</span>
                  <span className="score-value" data-testid="text-distance-score">{score.toString().padStart(4, '0')}m</span>
                </div>
                <div className="sprinkle-score" data-testid="text-sprinkle-score">
                  <SprinkleIcon />
                  <span className="score-value">{snapshot.sprinkles}</span>
                </div>
              </div>
            </div>

            <div
              aria-label="Game field. Tap, click, or press Space to jump."
              className="game-stage"
              data-testid="game-stage"
              onPointerDown={handleStagePointerDown}
            >
              <div className="wall-lines" />
              <div className="wall-shelf" />
              <div className="hanging-utensil" />
              <div className="counter-glint" />
              <div className="counter-edge" />

              {snapshot.collectibles.map((collectible) => (
                <div
                  className="game-object collectible"
                  data-testid={`collectible-${collectible.id}`}
                  key={collectible.id}
                  style={{ bottom: `${collectible.y / 5}%`, left: `${collectible.x / 10}%` }}
                />
              ))}

              {snapshot.obstacles.map((obstacle) => (
                <div
                  className="game-object obstacle"
                  data-testid={`obstacle-${obstacle.id}`}
                  key={obstacle.id}
                  style={{ bottom: `${FLOOR / 5}%`, height: `${obstacle.h / 5}%`, left: `${obstacle.x / 10}%` }}
                >
                  <ObstacleArt kind={obstacle.kind} />
                </div>
              ))}

              <div className={`game-object player ${snapshot.playerY > FLOOR + 3 ? 'jumping' : ''}`} data-testid="player-cake" style={playerStyle}>
                <CakeSprite />
              </div>

              {status === 'running' && <div className="stage-prompt">tap anywhere to hop</div>}

              {status !== 'running' && (
                <div className="game-overlay" data-testid={`status-${status}`}>
                  <div className="overlay-card">
                    <div className="overlay-kicker">{status === 'ready' ? 'fresh from the fridge' : 'the counter wins this round'}</div>
                    <h1 className="overlay-title">{status === 'ready' ? 'Ready, set, bake.' : 'A little frosting wobble.'}</h1>
                    <p className="overlay-copy">
                      {status === 'ready'
                        ? 'A tiny cake. One busy counter. See how far you can carry the layers.'
                        : 'That was a crunchy landing. Your next run starts with a clean counter.'}
                    </p>
                    <button
                      className="primary-button"
                      data-testid={status === 'ready' ? 'button-start-game' : 'button-restart-game'}
                      onClick={startGame}
                      type="button"
                    >
                      <JumpArrow />
                      {status === 'ready' ? 'Start the run' : 'Bake another run'}
                    </button>
                    <div className="stat-ribbon">
                      <span className="ribbon-stat">best <strong data-testid="text-best-score">{best}m</strong></span>
                      {status === 'gameover' && <span className="ribbon-stat">run <strong>{score}m</strong></span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="side-stack" aria-label="How to play">
            <section className="info-card">
              <div className="eyebrow">quick hands</div>
              <h2 className="info-title">Make the hop</h2>
              <div className="control-line">
                <span className="key-cap">SPACE</span>
                <span className="control-text">jump</span>
              </div>
              <div className="control-line">
                <span className="key-cap">↑</span>
                <span className="key-cap">W</span>
                <span className="control-text">jump</span>
              </div>
              <div className="control-line">
                <span className="key-cap">TAP</span>
                <span className="control-text">jump on touch</span>
              </div>
            </section>
            <section className="info-card tip-card">
              <div className="eyebrow">baker's note</div>
              <p className="tip-copy">Sprinkles are worth the detour. Clutter is not.</p>
            </section>
          </aside>
        </div>

        <footer className="footer-note">
          <span>one button · endless counter · no crumbs left behind</span>
          <span>best run saved locally</span>
        </footer>
      </div>
    </main>
  );
}

export default Home;