terraform {
  required_providers {
    hjs = {
      source  = "humanjudgment/hjs"
      version = "~> 1.0"
    }
  }
}

provider "hjs" {
  api_key = var.hjs_api_key
}

resource "hjs_account" "main" {
  name  = "My Organization"
  email = "admin@example.com"
  plan  = "pro"
}

resource "hjs_api_key" "production" {
  account_id  = hjs_account.main.id
  name        = "Production Key"
  permissions = ["read", "write"]
}

resource "hjs_webhook" "main" {
  account_id  = hjs_account.main.id
  url         = "https://myapp.com/webhooks/hjs"
  events      = ["judgment.created", "judgment.anchored"]
  description = "Main webhook"
}

output "account_id" {
  value = hjs_account.main.id
}
