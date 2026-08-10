import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/** Snapshot de conectividad (útil para POS / sync en VE). */
export async function getNetworkState(): Promise<NetInfoState> {
  return NetInfo.fetch();
}

export function subscribeNetwork(
  listener: (state: NetInfoState) => void,
): () => void {
  return NetInfo.addEventListener(listener);
}

export function isOnline(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}
