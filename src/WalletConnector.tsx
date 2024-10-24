/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Network, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

import {
  getCompatibleWallets,
  networks,
  walletConnectorIds,
  WalletId,
  walletNetworkCompatibility,
} from './wallet-config'

declare global {
  interface Window {
    ethereum?: any
    okxwallet?: any
    phantom?: any
  }
}

const WalletConnector = () => {
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [selectedWallet, setSelectedWallet] = useState<WalletId | ''>('')
  const [signature, setSignature] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const { toast } = useToast()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // Effect to handle chain changes
  useEffect(() => {
    if (chain?.id) {
      const network = networks.find((n) => n.chain.id === chain.id)
      if (network) {
        setSelectedNetwork(network.id)
        // If current wallet doesn't support this network, reset wallet selection
        if (
          selectedWallet &&
          !walletNetworkCompatibility[selectedWallet].some(
            (n) => n.id === network.id
          )
        ) {
          setSelectedWallet('')
        }
      }
    }
  }, [chain?.id])

  // Reset wallet selection when network changes
  useEffect(() => {
    setSelectedWallet('')
    setConnectError(null)
  }, [selectedNetwork])

  // Handle connect status changes
  useEffect(() => {
    if (!isConnecting) return

    if (isConnected) {
      setIsConnecting(false)
      setConnectError(null)
      toast({
        title: 'Success',
        description: 'Wallet connected successfully!',
      })
    }
  }, [isConnected, isConnecting, toast])

  const getWalletProvider = (walletId: WalletId) => {
    if (walletId === 'metamask' && window.ethereum?.isMetaMask) {
      return window.ethereum
    } else if (walletId === 'okx' && window.okxwallet) {
      return window.okxwallet
    } else if (walletId === 'phantom' && window.phantom?.ethereum) {
      return window.phantom.ethereum
    }
    return null
  }

  const requestPhantomAuthorization = async (provider: any) => {
    try {
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      return accounts[0]
    } catch (error) {
      console.error('Phantom authorization error:', error)
      throw error
    }
  }

  const handleConnect = async () => {
    if (!selectedNetwork || !selectedWallet) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select both network and wallet',
      })
      return
    }

    const network = networks.find((n) => n.id === selectedNetwork)
    if (!network) return

    setIsConnecting(true)
    setConnectError(null)

    try {
      const provider = getWalletProvider(selectedWallet)

      if (provider) {
        if (isConnected) {
          await disconnect()
        }

        // Handle Phantom authorization first
        if (selectedWallet === 'phantom') {
          await requestPhantomAuthorization(provider)
        }

        // Switch/Add chain
        const currentChainId = await provider.request({ method: 'eth_chainId' })
        if (parseInt(currentChainId, 16) !== network.chain.id) {
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${network.chain.id.toString(16)}` }],
            })
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: `0x${network.chain.id.toString(16)}`,
                    chainName: network.chain.name,
                    nativeCurrency: network.chain.nativeCurrency,
                    rpcUrls: [network.chain.rpcUrls.default.http[0]],
                    blockExplorerUrls: [
                      network.chain.blockExplorers?.default.url,
                    ],
                  },
                ],
              })
            } else {
              throw switchError
            }
          }
        }

        const connectorId = walletConnectorIds[selectedWallet]
        const connector = connectors.find((c) => c.id === connectorId)

        if (!connector) {
          throw new Error('No suitable connector found')
        }

        await connect({ connector })
      } else {
        setIsConnecting(false)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `${
            selectedWallet.charAt(0).toUpperCase() + selectedWallet.slice(1)
          } wallet is not installed`,
        })
      }
    } catch (error: any) {
      console.error('Failed to connect:', error)
      setIsConnecting(false)

      let errorMessage = 'Failed to connect wallet'
      if (error.code === 4001) {
        errorMessage = 'User rejected the connection request'
      } else if (error.message) {
        errorMessage = error.message
      }

      setConnectError(errorMessage)
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: errorMessage,
      })
    }
  }

  const handleSign = async () => {
    if (!isConnected || !address || !selectedWallet) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please connect wallet first',
      })
      return
    }

    const message =
      'Welcome to our dApp! Please sign this message to verify your ownership.'

    try {
      const provider = getWalletProvider(selectedWallet)
      if (!provider) throw new Error('No provider found')

      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      })
      setSignature(signature)

      toast({
        title: 'Success',
        description: 'Message signed successfully!',
      })
    } catch (error) {
      console.error('Failed to sign message:', error)
      toast({
        variant: 'destructive',
        title: 'Signing Failed',
        description: 'Failed to sign message. Please try again.',
      })
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setSignature(null)
    setConnectError(null)
    toast({
      title: 'Disconnected',
      description: 'Wallet disconnected successfully',
    })
  }

  return (
    <>
      <div className="max-w-md mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Network</label>
              <Select
                value={selectedNetwork}
                onValueChange={setSelectedNetwork}
                disabled={isConnected || isConnecting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose network..." />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((network) => (
                    <SelectItem key={network.id} value={network.id}>
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4" />
                        {network.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNetwork && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Wallet</label>
                <Select
                  value={selectedWallet}
                  onValueChange={(value) =>
                    setSelectedWallet(value as WalletId)
                  }
                  disabled={isConnected || isConnecting || !selectedNetwork}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose wallet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getCompatibleWallets(selectedNetwork).map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          {wallet.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {connectError && (
              <Alert variant="destructive">
                <AlertDescription>{connectError}</AlertDescription>
              </Alert>
            )}

            {!isConnected ? (
              <Button
                className="w-full"
                onClick={handleConnect}
                disabled={!selectedNetwork || !selectedWallet || isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={handleDisconnect}
                variant="destructive"
              >
                Disconnect
              </Button>
            )}
          </CardContent>
        </Card>

        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Sign Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Connected Address: {address}
                </AlertDescription>
              </Alert>

              <Button className="w-full" onClick={handleSign}>
                Sign Message
              </Button>

              {signature && (
                <Alert>
                  <AlertDescription className="break-all">
                    Signature: {signature}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

export default WalletConnector
