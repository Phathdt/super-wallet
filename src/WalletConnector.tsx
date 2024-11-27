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

const WalletConnector = () => {
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [selectedWallet, setSelectedWallet] = useState<WalletId | ''>('')
  const [signature, setSignature] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const { toast } = useToast()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, status } = useConnect()
  const { disconnect } = useDisconnect()

  // Detect if user is on mobile
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  // Effect to handle chain changes
  useEffect(() => {
    if (chain?.id) {
      const network = networks.find((n) => n.chain.id === chain.id)
      if (network) {
        setSelectedNetwork(network.id)
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

  useEffect(() => {
    setSelectedWallet('')
    setConnectError(null)
  }, [selectedNetwork])

  // Handle connect status changes
  useEffect(() => {
    if (status === 'success') {
      setIsConnecting(false)
      setConnectError(null)
      toast({
        title: 'Success',
        description: 'Wallet connected successfully!',
      })
    } else if (status === 'error') {
      setIsConnecting(false)
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Failed to connect wallet. Please try again.',
      })
    }
  }, [status, toast])

  const getMobileWalletDeepLink = (walletId: WalletId) => {
    const deepLinks: Record<WalletId, string> = {
      metamask: 'metamask://',
      phantom: 'phantom://',
      okx: 'okx://',
    }
    return deepLinks[walletId]
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
      if (isConnected) {
        await disconnect()
      }

      // Find the appropriate connector
      const connector = connectors.find((c) => {
        if (isMobile) {
          return c.id === 'walletConnect'
        }

        return c.id === walletConnectorIds[selectedWallet]
      })

      if (!connector) {
        throw new Error('No suitable connector found')
      }

      // If on mobile and we have a deep link, try to open the wallet app
      if (isMobile) {
        const deepLink = getMobileWalletDeepLink(selectedWallet)
        if (deepLink) {
          window.location.href = deepLink
        }
      }

      // Connect using the selected connector
      await connect({ connector })

      // Switch network if needed (for non-mobile)
      if (window.ethereum && !isMobile) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${network.chain.id.toString(16)}` }],
          })
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
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
          }
        }
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
      let provider
      if (selectedWallet === 'metamask') {
        provider = window.ethereum
      } else if (selectedWallet === 'okx') {
        provider = window.okxwallet
      } else if (selectedWallet === 'phantom') {
        provider = window.phantom
      }

      if (!provider) throw new Error('No provider found')

      let signature
      if (selectedWallet === 'okx') {
        // OKX cần thứ tự [address, message]
        signature = await provider.request({
          method: 'personal_sign',
          params: [address, message],
        })
      } else {
        // MetaMask và các ví khác dùng thứ tự [message, address]
        signature = await provider.request({
          method: 'personal_sign',
          params: [message, address],
        })
      }

      setSignature(signature)

      toast({
        title: 'Success',
        description: 'Message signed successfully!',
      })
    } catch (error: any) {
      console.error('Failed to sign message:', error)
      let errorMessage = 'Failed to sign message. Please try again.'
      if (error.message) {
        errorMessage = error.message
      }

      toast({
        variant: 'destructive',
        title: 'Signing Failed',
        description: errorMessage,
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
              Connect Wallet {isMobile ? '(Mobile)' : '(Desktop)'}
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
