data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

data "azurerm_client_config" "current" {}

data "azuread_client_config" "current" {}

# Artifact Signing account
resource "azurerm_code_signing_account" "main" {
  name                = var.signing_account_name
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  sku_name            = "Basic"
}

# Note: the certificate profile must be created via the Azure portal after identity
# validation is complete. Identity validation requires manual review by Microsoft and
# cannot be automated. Once complete, set var.certificate_profile_name to match.

# Service principal used by GitHub Actions for OIDC authentication
resource "azuread_application" "github_actions" {
  display_name = "photo-id-github-actions"
}

resource "azuread_service_principal" "github_actions" {
  client_id = azuread_application.github_actions.client_id
}

# Federated identity credential scoped to tag pushes on this repository which allows GitHub Actions
# to exchange its OIDC token for an Azure access token without needing a client secret
resource "azuread_application_federated_identity_credential" "github_tags" {
  application_id = azuread_application.github_actions.id
  display_name   = "github-actions-tags"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${var.github_owner}/${var.github_repository}:ref:refs/tags/*"
}

# Grant the service principal permission to sign with the certificate profile
resource "azurerm_role_assignment" "code_signing_signer" {
  scope                = azurerm_code_signing_account.main.id
  role_definition_name = "Code Signing Certificate Profile Signer"
  principal_id         = azuread_service_principal.github_actions.object_id
}
