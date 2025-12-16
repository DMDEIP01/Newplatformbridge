import eipLogo from "@/assets/eip-logo.png";

export function PoweredByEIP() {
  return (
    <div className="w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Powered by</span>
          <img src={eipLogo} alt="EIP" className="h-8 w-auto" />
        </div>
      </div>
    </div>
  );
}
