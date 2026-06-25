// Temporary mock — SDK integration coming soon
export const sorostream = {
  createStream: async (_params: { recipient: string; amount: string; duration: number; sender: string }) => ({ streamId: '0', txHash: '' }),
  withdraw: async (_params: { streamId: string; sender: string }) => ({ txHash: '', amount: '0' }),
  cancelStream: async (_params: { streamId: string; sender: string }) => ({ txHash: '' }),
  topUp: async (_params?: unknown) => ({ txHash: '', newEndTime: new Date() }),
  getStream: async (_id?: unknown) => null,
  getClaimable: async (_id?: unknown) => '0',
  getStreamsBySender: async (_address?: unknown) => [],
  getStreamsByRecipient: async (_address?: unknown) => [],
}

export const createClient = () => sorostream

export function formatUSDC(stroops: bigint): string {
  return (Number(stroops) / 10000000).toFixed(2)
}

export function toStroops(usdc: string): bigint {
  return BigInt(Math.round(parseFloat(usdc) * 10000000))
}

export function calculateFlowRate(stroops: bigint, durationSeconds: number): bigint {
  if (durationSeconds === 0) return BigInt(0)
  return stroops / BigInt(durationSeconds)
}

export function claimableNow(stream: any): string {
  return '0'
}

export function truncateAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}
