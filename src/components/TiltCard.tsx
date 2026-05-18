import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { useTilt } from "@/hooks/use-tilt";

interface TiltCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  as?: "div";
  max?: number;
  scale?: number;
}

/** Wrapper that applies the GSAP useTilt hook to a single element. */
const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(function TiltCard(
  { children, max, scale, className, ...rest },
  _externalRef,
) {
  const ref = useTilt<HTMLDivElement>({ max, scale });
  return (
    <div ref={ref} className={className} {...rest}>
      {children}
    </div>
  );
});

export default TiltCard;
