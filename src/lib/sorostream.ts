// Temporary mock — SDK integration coming soon
export const sorostream = {
  createStream: async () => ({ streamId: '0', txHash: '' }),
  withdraw: async () => ({ txHash: '', amount: '0' }),
  cancelStream: async () => ({ txHash: '' }),
  topUp: async () => ({ txHash: '', newEndTime: new Date() }),
  getStream: async () => null,
  getClaimable: async () => '0',
  getStreamsBySender: async () => [],
  getStreamsByRecipient: async () => [],
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
