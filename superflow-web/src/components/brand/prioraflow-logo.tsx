import Image from "next/image";

type PrioraFlowLogoProps = {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
  framed?: boolean;
};

export function PrioraFlowLogo({ className = "", imageClassName = "h-12 w-auto", compact = false, framed = false }: PrioraFlowLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <div className={framed ? "rounded-2xl bg-white/95 p-1.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-100" : ""}>
        <Image
          src={compact ? "/prioraflow-icon.png" : "/prioraflow-logo.png"}
          alt="PrioraFlow logo"
          width={compact ? 512 : 409}
          height={compact ? 512 : 288}
          priority
          className={`${imageClassName} object-contain`}
        />
      </div>
    </div>
  );
}
