variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
  type        = string
}

variable "github_owner" {
  description = "GitHub organisation name"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
}

variable "apple_certificate" {
  description = "Base64-encoded Apple .p12 signing certificate"
  type        = string
  sensitive   = true
}

variable "apple_certificate_password" {
  description = "Password for the Apple .p12 signing certificate"
  type        = string
  sensitive   = true
}

variable "apple_id" {
  description = "Apple ID email used for notarization"
  type        = string
  sensitive   = true
}

variable "apple_app_specific_password" {
  description = "App-specific password for Apple notarization"
  type        = string
  sensitive   = true
}

variable "apple_team_id" {
  description = "Apple Developer Team ID"
  type        = string
}

variable "azure_client_id" {
  description = "Client ID of the Azure service principal used by GitHub Actions"
  type        = string
  sensitive   = true
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
  sensitive   = true
}

variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
  sensitive   = true
}

variable "azure_code_signing_account_name" {
  description = "Azure Artifact Signing account name"
  type        = string
}

variable "azure_code_signing_endpoint" {
  description = "Azure Artifact Signing regional endpoint URL"
  type        = string
}

variable "azure_code_signing_certificate_profile_name" {
  description = "Azure Artifact Signing certificate profile name"
  type        = string
}
