declare module "bcryptjs" {
  export function compare(s: string, hash: string): Promise<boolean>;
  export function compareSync(s: string, hash: string): boolean;
  export function hash(s: string, salt: number | string): Promise<string>;
  export function hashSync(s: string, salt: number | string): string;
}

declare module "jsonwebtoken" {
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: string | Buffer, options?: any): string;
  export function verify(token: string, secretOrPublicKey: string | Buffer, options?: any): any;
  export function decode(token: string, options?: any): any;
}

declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
