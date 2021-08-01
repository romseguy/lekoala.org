import React from "react";
import {
  BorderProps,
  Grid as ChakraGrid,
  SpacerProps,
  GridProps,
  useColorModeValue
} from "@chakra-ui/react";

export const Grid = ({
  children,
  light,
  dark,
  ...props
}: BorderProps &
  SpacerProps &
  GridProps & {
    children: React.ReactNode | React.ReactNodeArray;
    light?: { [key: string]: any };
    dark?: { [key: string]: any };
  }) => {
  const styles = useColorModeValue(light, dark);
  return (
    <ChakraGrid {...styles} {...props}>
      {children}
    </ChakraGrid>
  );
};
