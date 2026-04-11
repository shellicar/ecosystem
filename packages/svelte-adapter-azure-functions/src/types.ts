// https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-user-identities#decoding-the-client-principal-header

export type ClientPrincipalClaim = {
  /**
   * Type
   */
  typ: string;
  /**
   * Value
   */
  val: string;
};

export type ClientPrincipal = {
  /**
   * Identity Provider
   */
  auth_typ: string;
  /**
   * Claims
   */
  claims: ClientPrincipalClaim[];
  /**
   * Name Claim Type
   */
  name_typ: string;
  /**
   * Role Claim Type
   */
  role_typ: string;
};
