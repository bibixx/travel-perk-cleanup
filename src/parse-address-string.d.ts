declare module "parse-address-string" {
  export interface Address {
    street_address1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  }

  type Callback = (err: Error | false, addressObj: Address) => void;
  export default function (addressString: string, callback: Callback): void;
}
