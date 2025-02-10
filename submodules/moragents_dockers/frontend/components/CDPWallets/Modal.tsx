import { useState, useEffect, useCallback } from "react";
import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  useToast,
  Input,
  Select,
  FormControl,
  FormLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import { CopyIcon, DeleteIcon, DownloadIcon, StarIcon } from "@chakra-ui/icons";

const NETWORKS = [
  "base-mainnet",
  "base-sepolia",
  "base-goerli",
  "ethereum-mainnet",
  "ethereum-goerli",
  "ethereum-sepolia",
];

interface CDPWalletsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Wallet {
  wallet_id: string;
  network_id: string;
  address: string;
}

export const CDPWalletsModal: React.FC<CDPWalletsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [newWalletName, setNewWalletName] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0]);
  const [walletFile, setWalletFile] = useState<File | null>(null);
  const [walletToDelete, setWalletToDelete] = useState("");
  const [confirmWalletId, setConfirmWalletId] = useState("");
  const toast = useToast();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const fetchWallets = useCallback(async () => {
    try {
      const [walletsResponse, activeWalletResponse] = await Promise.all([
        fetch("http://localhost:8888/wallets/list"),
        fetch("http://localhost:8888/wallets/active"),
      ]);

      const walletsData = await walletsResponse.json();
      const activeData = await activeWalletResponse.json();

      setWallets(walletsData.wallets || []);
      setActiveWallet(activeData.active_wallet_id);
    } catch (error) {
      console.error("Failed to fetch wallets:", error);
      toast({
        title: "Error fetching wallets",
        status: "error",
        duration: 3000,
      });
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchWallets();
    }
  }, [isOpen, fetchWallets]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied to clipboard",
      status: "success",
      duration: 2000,
    });
  };

  const handleSetActiveWallet = async (walletId: string) => {
    try {
      const response = await fetch("http://localhost:8888/wallets/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_id: walletId }),
      });

      if (response.ok) {
        setActiveWallet(walletId);
        toast({
          title: "Active wallet set successfully",
          status: "success",
          duration: 3000,
        });
      } else {
        throw new Error("Failed to set active wallet");
      }
    } catch (error) {
      console.error("Error setting active wallet:", error);
      toast({
        title: "Failed to set active wallet",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleCreateWallet = async () => {
    if (!newWalletName.trim()) {
      toast({
        title: "Please enter a wallet name",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch("http://localhost:8888/wallets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: newWalletName,
          network_id: selectedNetwork,
          set_active: true,
        }),
      });

      if (response.ok) {
        toast({
          title: "Wallet created successfully",
          status: "success",
          duration: 3000,
        });
        setNewWalletName("");
        fetchWallets();
      } else {
        throw new Error("Failed to create wallet");
      }
    } catch (error) {
      console.error("Error creating wallet:", error);
      toast({
        title: "Failed to create wallet",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleRestoreWallet = async () => {
    if (!walletFile) {
      toast({
        title: "Please select a wallet file",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      const fileContent = await walletFile.text();
      const walletData = JSON.parse(fileContent);

      const response = await fetch("http://localhost:8888/wallets/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: walletData.wallet_id,
          wallet_data: walletData,
          set_active: true,
        }),
      });

      if (response.ok) {
        toast({
          title: "Wallet restored successfully",
          status: "success",
          duration: 3000,
        });
        setWalletFile(null);
        fetchWallets();
      } else {
        throw new Error("Failed to restore wallet");
      }
    } catch (error) {
      console.error("Error restoring wallet:", error);
      toast({
        title: "Failed to restore wallet",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDownloadWallet = async (walletId: string) => {
    try {
      const response = await fetch(
        `http://localhost:8888/wallets/export/${walletId}`
      );

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${walletId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Wallet exported successfully",
          status: "success",
          duration: 3000,
        });
      } else {
        throw new Error("Failed to export wallet");
      }
    } catch (error) {
      console.error("Error exporting wallet:", error);
      toast({
        title: "Failed to export wallet",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDeleteWallet = async () => {
    if (confirmWalletId !== walletToDelete) {
      toast({
        title: "Wallet ID does not match",
        status: "error",
        duration: 3000,
      });
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8888/wallets/${walletToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          title: "Wallet deleted successfully",
          status: "success",
          duration: 3000,
        });
        onDeleteClose();
        setConfirmWalletId("");
        setWalletToDelete("");
        fetchWallets();
      } else {
        throw new Error("Failed to delete wallet");
      }
    } catch (error) {
      console.error("Error deleting wallet:", error);
      toast({
        title: "Failed to delete wallet",
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="#1f1f1f" color="white">
          <ModalHeader>CDP Wallet Management</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Tabs isFitted variant="enclosed">
              <TabList mb="1em">
                <Tab>Wallets</Tab>
                <Tab>Create New</Tab>
                <Tab>Restore</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    {wallets.map((wallet) => (
                      <Box
                        key={wallet.wallet_id}
                        p={4}
                        borderRadius="md"
                        bg="#2d2d2d"
                      >
                        <HStack justify="space-between">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">{wallet.wallet_id}</Text>
                            <Text fontSize="sm" color="gray.400">
                              {wallet.network_id}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {wallet.address}
                            </Text>
                          </VStack>
                          <HStack>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyAddress(wallet.address)}
                            >
                              <CopyIcon />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              colorScheme={
                                activeWallet === wallet.wallet_id
                                  ? "yellow"
                                  : "gray"
                              }
                              onClick={() =>
                                handleSetActiveWallet(wallet.wallet_id)
                              }
                            >
                              <StarIcon />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleDownloadWallet(wallet.wallet_id)
                              }
                            >
                              <DownloadIcon />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => {
                                setWalletToDelete(wallet.wallet_id);
                                onDeleteOpen();
                              }}
                            >
                              <DeleteIcon />
                            </Button>
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Wallet Name</FormLabel>
                      <Input
                        placeholder="Enter wallet name"
                        value={newWalletName}
                        onChange={(e) => setNewWalletName(e.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Network</FormLabel>
                      <Select
                        value={selectedNetwork}
                        onChange={(e) => setSelectedNetwork(e.target.value)}
                      >
                        {NETWORKS.map((network) => (
                          <option key={network} value={network}>
                            {network}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      colorScheme="blue"
                      width="full"
                      onClick={handleCreateWallet}
                    >
                      Create Wallet
                    </Button>
                  </VStack>
                </TabPanel>
                <TabPanel>
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Upload Wallet File</FormLabel>
                      <Button
                        as="label"
                        htmlFor="file-upload"
                        variant="outline"
                        width="full"
                        cursor="pointer"
                      >
                        {walletFile ? walletFile.name : "Choose wallet file"}
                        <input
                          id="file-upload"
                          type="file"
                          accept=".json"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files) {
                              setWalletFile(e.target.files[0]);
                            }
                          }}
                        />
                      </Button>
                    </FormControl>
                    <Button
                      colorScheme="blue"
                      width="full"
                      onClick={handleRestoreWallet}
                    >
                      Restore Wallet
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => {
          onDeleteClose();
          setConfirmWalletId("");
          setWalletToDelete("");
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="#1f1f1f" color="white">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Wallet
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={4}>
                To confirm deletion, please type the wallet ID:{" "}
                <Text as="span" fontWeight="bold">
                  {walletToDelete}
                </Text>
              </Text>
              <Input
                value={confirmWalletId}
                onChange={(e) => setConfirmWalletId(e.target.value)}
                placeholder="Enter wallet ID to confirm"
              />
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteWallet} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
