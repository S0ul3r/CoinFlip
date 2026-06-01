export function catalogRunId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
