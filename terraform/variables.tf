variable "cloudflare_account_id" {
  type      = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type      = string
  sensitive = true
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

# variable "resource_group_name" {
#   description = "Name of the existing Azure resource group"
#   type        = string
# }

# variable "signing_account_name" {
#   description = "Name of the Azure Artifact Signing account"
#   type        = string
# }

# variable "certificate_profile_name" {
#   description = "Name of the Azure Artifact Signing certificate profile"
#   type        = string
# }
