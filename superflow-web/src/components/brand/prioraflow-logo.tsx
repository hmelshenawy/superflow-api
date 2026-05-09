import Image from "next/image";

type PrioraFlowLogoProps = {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
};

export function PrioraFlowLogo({ className = "", iconClassName = "h-10 w-10", showText = true }: PrioraFlowLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/prioraflow-icon.png"
        alt="PrioraFlow logo"
        width={512}
        height={512}
        priority
        className={`${iconClassName} rounded-[30%] object-contain shadow-sm ring-1 ring-black/5`}
      />
      {showText && (
        <div>
          <p className="text-base font-bold tracking-tight">PrioraFlow</p>
          <p className="text-xs text-slate-500">Clarity in every step</p>
        </div>
      )}
    </div>
  );
}
