terraform {
  required_version = "~> 1.14.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }

    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  cloud {
    organization = "CRRU"

    workspaces {
      name = "photo-id-app"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "azuread" {}

provider "github" {
  owner = var.github_owner
}
