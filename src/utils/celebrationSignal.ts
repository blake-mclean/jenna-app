// Mutable flag: log-ride sets pending=true before router.back(),
// home screen reads and clears it in useFocusEffect.
export const celebrationSignal = { pending: false };
