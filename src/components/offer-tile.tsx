import { AddToCart } from "@/components/add-to-cart";
import { CardTile } from "@/components/ui";
import type { Offer } from "@/lib/catalog-query";

export function OfferTile({ o, priority }: { o: Offer; priority?: boolean }) {
  return (
    <CardTile
      href={`/karta/${encodeURIComponent(o.cardSlug)}?kus=${encodeURIComponent(o.id)}`}
      name={o.name}
      set={o.set}
      number={o.number}
      condition={o.condition}
      lang={o.lang}
      finish={o.finish || undefined}
      priceHal={o.priceHal}
      wasPriceHal={o.wasPriceHal}
      stock={o.stock}
      image={o.image ?? undefined}
      priority={priority}
      cta={o.stock > 0 ? <AddToCart offerId={o.id} size="sm" compact /> : undefined}
    />
  );
}
