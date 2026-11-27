import { Composition } from "remotion";
import { Promo, promoLength } from "./Promo";

export const Root = () => (
  <Composition id="Promo" component={Promo} durationInFrames={promoLength()} fps={30} width={1920} height={1080} />
);
