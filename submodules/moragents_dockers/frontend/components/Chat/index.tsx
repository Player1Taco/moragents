import React, { FC, useEffect, useState } from "react";
import { Flex, Box, useBreakpointValue } from "@chakra-ui/react";
import { ChatMessage } from "@/services/types";
// import { useTransactionConfirmations } from "wagmi";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ChatProps } from "@/components/Chat/types";

export const Chat: FC<ChatProps> = ({
  onSubmitMessage,
  messages,
  isSidebarOpen = false,
  setIsSidebarOpen,
}) => {
  const [messagesData, setMessagesData] = useState<ChatMessage[]>(messages);
  const [isLoading, setIsLoading] = useState(false);

  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    if (messages.length > 0) {
      setMessagesData([...messages]);
    }
  }, [messages]);

  const handleSubmit = async (message: string, file: File | null) => {
    setIsLoading(true);
    await onSubmitMessage(message, file);
    setIsLoading(false);
  };

  return (
    <Box position="relative" height="100%" width="100%">
      <Flex
        direction="column"
        height="100%"
        width="100%"
        transition="all 0.3s ease-in-out"
        mt={2}
        paddingLeft={isMobile ? "5%" : isSidebarOpen ? "30%" : "20%"}
        paddingRight={isMobile ? "5%" : isSidebarOpen ? "20%" : "20%"}
        ml="auto"
        mr="auto"
      >
        <MessageList messages={messagesData} />
        {isLoading && <LoadingIndicator />}
        <ChatInput
          onSubmit={handleSubmit}
          hasMessages={messagesData.length > 1}
          disabled={isLoading}
          isSidebarOpen={isSidebarOpen}
        />
      </Flex>
    </Box>
  );
};
