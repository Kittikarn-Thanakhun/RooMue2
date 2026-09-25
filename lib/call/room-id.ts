/**
 * Deterministic WebRTC room id for a direct 1:1 call between two users — both
 * sides independently compute the same string with no manual code entry.
 */
export function directCallRoomId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join("~");
}
