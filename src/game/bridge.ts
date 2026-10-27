/**
 * Tiny typed event bus for React -> Phaser commands.
 * Deliberately has no Phaser import so React code can use it during SSR.
 */
export interface BridgeEvents {
  /** Leave the menu / results and place the bird for a new run, starting in the given zone (0 = normal run). */
  start: { zoneIndex: number };
  /** Go back to the start screen. */
  menu: void;
  /** Resume after the tab was hidden. */
  resume: void;
  /** Paid continue: resume the run from the crash. */
  continue: void;
}

type Handler<T> = (payload: T) => void;
type AnyHandler = (payload: unknown) => void;

class Bridge {
  private readonly handlers = new Map<keyof BridgeEvents, Set<AnyHandler>>();

  on<K extends keyof BridgeEvents>(event: K, handler: Handler<BridgeEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    const wrapped = handler as AnyHandler;
    set.add(wrapped);
    return () => {
      set.delete(wrapped);
    };
  }

  emit<K extends keyof BridgeEvents>(
    event: K,
    ...args: BridgeEvents[K] extends void ? [] : [BridgeEvents[K]]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    const payload = args.length > 0 ? args[0] : undefined;
    for (const handler of Array.from(set)) handler(payload);
  }
}

export const gameBridge = new Bridge();
