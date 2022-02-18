import { Textarea as ChakraTextarea, useColorMode } from "@chakra-ui/react";
import styled from "@emotion/styled";

export const Textarea = styled(ChakraTextarea)((/* props */) => {
  const { colorMode } = useColorMode();
  if (/* props. */ colorMode === "dark")
    return `
    border: 1px solid #c6cacf;

    :hover {
      border: 1px solid white;
    }

    ::placeholder {
      color: #7b8593;
    }
    `;
  return null;
});
