import useScript, { ScriptStatus } from "@charlietango/use-script";
import { useEffect } from "react";

declare const PayPal: any;

export const PaypalButton = () => {
  const [loaded, status] = useScript(
    "https://www.paypalobjects.com/donate/sdk/donate-sdk.js"
  );

  useEffect(() => {
    if (status === ScriptStatus.READY) {
      PayPal.Donation.Button({
        env: "production",
        hosted_button_id: "Z59K3UWBJDUS8",
        image: {
          src: "https://www.paypalobjects.com/fr_FR/FR/i/btn/btn_donate_SM.gif",
          alt: "Faire un don"
        }
      }).render("#donate-button");
    }
  }, [status]);

  if (status === ScriptStatus.ERROR) return null;

  return (
    <div id="donate-button-container">
      <div id="donate-button"></div>
    </div>
  );
};
