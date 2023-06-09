import { LinkIcon } from "@chakra-ui/icons";
import {
  useToast,
  Tooltip,
  IconButton,
  IconButtonProps,
  TooltipProps
} from "@chakra-ui/react";
import React from "react";

export const LinkShare = ({
  label,
  url,
  tooltipProps,
  ...props
}: Omit<IconButtonProps, "aria-label"> & {
  label: string;
  url: string;
  tooltipProps?: Partial<TooltipProps>;
}) => {
  const toast = useToast({ position: "top" });

  return (
    <Tooltip label={label} placement="left" {...tooltipProps}>
      <IconButton
        aria-label={label}
        icon={<LinkIcon />}
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(url);
          toast({
            title: "Le lien a été copié dans votre presse-papiers",
            status: "success"
          });
        }}
        {...props}
      />
    </Tooltip>
  );
};
