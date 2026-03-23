# resource "github_actions_secret" "azure_client_id" {
#   repository      = var.github_repository
#   secret_name     = "AZURE_CLIENT_ID"
#   plaintext_value = azuread_application.github_actions.client_id
# }

# resource "github_actions_secret" "azure_tenant_id" {
#   repository      = var.github_repository
#   secret_name     = "AZURE_TENANT_ID"
#   plaintext_value = data.azuread_client_config.current.tenant_id
# }

# resource "github_actions_secret" "azure_subscription_id" {
#   repository      = var.github_repository
#   secret_name     = "AZURE_SUBSCRIPTION_ID"
#   plaintext_value = data.azurerm_client_config.current.subscription_id
# }

# resource "github_actions_variable" "azure_code_signing_account_name" {
#   repository    = var.github_repository
#   variable_name = "AZURE_CODE_SIGNING_ACCOUNT_NAME"
#   value         = azurerm_code_signing_account.main.name
# }

# resource "github_actions_variable" "azure_code_signing_endpoint" {
#   repository    = var.github_repository
#   variable_name = "AZURE_CODE_SIGNING_ENDPOINT"
#   value         = azurerm_code_signing_account.main.account_uri
# }

# resource "github_actions_variable" "azure_code_signing_certificate_profile_name" {
#   repository    = var.github_repository
#   variable_name = "AZURE_CODE_SIGNING_CERTIFICATE_PROFILE_NAME"
#   value         = var.certificate_profile_name
# }

resource "github_actions_secret" "apple_certificate" {
  repository      = var.github_repository
  secret_name     = "APPLE_CERTIFICATE"
  plaintext_value = var.apple_certificate
}

resource "github_actions_secret" "apple_certificate_password" {
  repository      = var.github_repository
  secret_name     = "APPLE_CERTIFICATE_PASSWORD"
  plaintext_value = var.apple_certificate_password
}

resource "github_actions_secret" "apple_id" {
  repository      = var.github_repository
  secret_name     = "APPLE_ID"
  plaintext_value = var.apple_id
}

resource "github_actions_secret" "apple_app_specific_password" {
  repository      = var.github_repository
  secret_name     = "APPLE_APP_SPECIFIC_PASSWORD"
  plaintext_value = var.apple_app_specific_password
}

resource "github_actions_secret" "apple_team_id" {
  repository      = var.github_repository
  secret_name     = "APPLE_TEAM_ID"
  plaintext_value = var.apple_team_id
}
