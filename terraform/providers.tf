terraform {
  required_version = "~> 1.14.5"

  required_providers {
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

provider "github" {
  owner = var.github_owner
}
