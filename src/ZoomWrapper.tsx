import type { ReactNode } from "react";

type ZoomWrapperProps = {
  children: ReactNode;
};

export default function ZoomWrapper({ children }: ZoomWrapperProps) {
  return <div style={{ touchAction: "pan-x pan-y pinch-zoom" }}>{children}</div>;
}
