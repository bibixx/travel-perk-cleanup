import parseAddressBase, { Address } from "parse-address-string";

export const parseAddress = (addressString: string) =>
  new Promise<Address>((resolve, reject) => {
    parseAddressBase(addressString, (err, addressObj) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(addressObj);
    });
  });
