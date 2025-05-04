#############################################################
# Pinia to Redis Migration Cleanup Script
#
# This script performs the necessary cleanup steps after
# migrating from Pinia to Redis for state management:
# 1. Updates package.json to remove Pinia and add Redis
# 2. Removes obsolete Pinia files and references
# 3. Updates TypeScript configurations
# 4. Provides documentation
#############################################################

# Set error action preference
$ErrorActionPreference = "Stop"

# Project root directory
$projectRoot = $PSScriptRoot

# Colors for output
function Write-ColorOutput($message, $color) {
    $prevColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $color
    Write-Output $message
    $host.UI.RawUI.ForegroundColor = $prevColor
}

function Write-Success($message) { Write-ColorOutput $message "Green" }
function Write-Info($message) { Write-ColorOutput $message "Cyan" }
function Write-Warning($message) { Write-ColorOutput $message "Yellow" }
function Write-Error($message) { Write-ColorOutput $message "Red" }

Write-Info "Starting Pinia to Redis migration cleanup..."

#############################################################
# 1. Update package.json
#############################################################
Write-Info "Updating package.json..."

try {
    $packageJsonPath = Join-Path $projectRoot "package.json"
    $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json

    # Remove Pinia dependencies
    $piniaRemoved = $false
    $pluginRemoved = $false

    # Check if pinia exists in dependencies
    if ($packageJson.dependencies.pinia) {
        $packageJson.dependencies.PSObject.Properties.Remove("pinia")
        $piniaRemoved = $true
        Write-Success "Removed pinia from dependencies"
    }

    # Check if pinia plugin exists in dependencies
    if ($packageJson.dependencies."pinia-plugin-persistedstate") {
        $packageJson.dependencies.PSObject.Properties.Remove("pinia-plugin-persistedstate")
        $pluginRemoved = $true
        Write-Success "Removed pinia-plugin-persistedstate from dependencies"
    }

    # Add Redis dependencies if they don't exist
    $redisExists = $false
    if (-not $packageJson.dependencies.redis) {
        $packageJson.dependencies | Add-Member -Name "redis" -Value "^4.6.7" -MemberType NoteProperty
        Write-Success "Added redis client dependency"
    } else {
        $redisExists = $true
        Write-Info "Redis dependency already exists"
    }

    # Add crypto-js for encryption if it doesn't exist
    $cryptoExists = $false
    if (-not $packageJson.dependencies."crypto-js") {
        $packageJson.dependencies | Add-Member -Name "crypto-js" -Value "^4.1.1" -MemberType NoteProperty
        Write-Success "Added crypto-js dependency for encryption"
    } else {
        $cryptoExists = $true
        Write-Info "crypto-js dependency already exists"
    }

    # Add types for redis and crypto-js if they don't exist
    if (-not $packageJson.devDependencies."@types/redis") {
        if (-not $packageJson.devDependencies) {
            $packageJson | Add-Member -Name "devDependencies" -Value @{} -MemberType NoteProperty
        }
        $packageJson.devDependencies | Add-Member -Name "@types/redis" -Value "^4.0.11" -MemberType NoteProperty
        Write-Success "Added @types/redis dev dependency"
    }

    if (-not $packageJson.devDependencies."@types/crypto-js") {
        if (-not $packageJson.devDependencies) {
            $packageJson | Add-Member -Name "devDependencies" -Value @{} -MemberType NoteProperty
        }
        $packageJson.devDependencies | Add-Member -Name "@types/crypto-js" -Value "^4.1.1" -MemberType NoteProperty
        Write-Success "Added @types/crypto-js dev dependency"
    }

    # Save updated package.json
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path $packageJsonPath
    Write-Success "Updated package.json successfully"

    # Summary of changes
    Write-Info "Package.json changes summary:"
    if ($piniaRemoved) { Write-Info "- Removed pinia dependency" }
    if ($pluginRemoved) { Write-Info "- Removed pinia-plugin-persistedstate dependency" }
    if (-not $redisExists) { Write-Info "- Added redis dependency" }
    if (-not $cryptoExists) { Write-Info "- Added crypto-js dependency" }
    Write-Info "- Added necessary TypeScript type definitions"
} catch {
    Write-Error "Failed to update package.json: $_"
    exit 1
}

#############################################################
# 2. Clean up remaining Pinia references and files
#############################################################
Write-Info "Cleaning up Pinia files and references..."

# Files to check for Pinia references
$filesToCheck = @(
    "src\main.ts",
    "src\App.vue",
    "src\router\index.ts"
)

$piniaPatternsToReplace = @(
    @{
        Pattern = "import { createPinia } from 'pinia'";
        Replacement = "// Pinia import removed during Redis migration"
    },
    @{
        Pattern = "import pinia from './store'";
        Replacement = "// Pinia import removed during Redis migration"
    },
    @{
        Pattern = "app.use(pinia)";
        Replacement = "// Pinia registration removed during Redis migration"
    }
)

foreach ($file in $filesToCheck) {
    $filePath = Join-Path $projectRoot $file
    if (Test-Path $filePath) {
        $content = Get-Content -Path $filePath -Raw
        $modified = $false

        foreach ($pattern in $piniaPatternsToReplace) {
            if ($content -match $pattern.Pattern) {
                $content = $content -replace $pattern.Pattern, $pattern.Replacement
                $modified = $true
            }
        }

        if ($modified) {
            Set-Content -Path $filePath -Value $content
            Write-Success "Updated Pinia references in $file"
        } else {
            Write-Info "No Pinia references found in $file"
        }
    } else {
        Write-Warning "File not found: $file"
    }
}

# Check for old Pinia store files that can be marked for deletion
$storeFilesToCheck = @(
    "src\store\auth.ts",
    "src\store\settings.ts"
)

$backupFolder = Join-Path $projectRoot "src\store\pinia-backup"
if (-not (Test-Path $backupFolder)) {
    New-Item -ItemType Directory -Path $backupFolder | Out-Null
    Write-Info "Created backup folder for Pinia stores: $backupFolder"
}

foreach ($file in $storeFilesToCheck) {
    $filePath = Join-Path $projectRoot $file
    if (Test-Path $filePath) {
        $fileName = Split-Path $filePath -Leaf
        $backupPath = Join-Path $backupFolder $fileName
        
        # Make a backup
        Copy-Item -Path $filePath -Destination $backupPath
        
        # Add a comment at the top of the original file indicating it's deprecated
        $content = Get-Content -Path $filePath
        $deprecatedComment = @"
/**
 * @deprecated This Pinia store has been replaced by Redis-backed implementation.
 * See redisAuth.ts or redisSettings.ts for the new implementation.
 * This file is kept for reference and will be removed in a future update.
 */

"@
        $deprecatedComment + $content | Set-Content -Path $filePath
        
        Write-Success "Marked $file as deprecated and created backup"
    }
}

#############################################################
# 3. Update .env files to include Redis configuration
#############################################################
Write-Info "Updating environment configuration files..."

$envFiles = @(
    ".env",
    ".env.development",
    ".env.production"
)

$redisEnvConfig = @"
# Redis Configuration (added during Pinia to Redis migration)
VUE_APP_REDIS_URL=redis://localhost:6379
VUE_APP_REDIS_USERNAME=
VUE_APP_REDIS_PASSWORD=
VUE_APP_REDIS_TLS=false
VUE_APP_REDIS_ENCRYPTION_ENABLED=true
VUE_APP_REDIS_ENCRYPTION_SECRET=change-this-to-a-secure-secret-key
"@

foreach ($envFile in $envFiles) {
    $envPath = Join-Path $projectRoot $envFile
    if (Test-Path $envPath) {
        $content = Get-Content -Path $envPath -Raw
        
        # Check if Redis config already exists
        if ($content -match "VUE_APP_REDIS_URL") {
            Write-Info "Redis configuration already exists in $envFile"
        } else {
            # Add Redis configuration
            $content = $content + "`n`n" + $redisEnvConfig
            Set-Content -Path $envPath -Value $content
            Write-Success "Added Redis configuration to $envFile"
        }
    } else {
        # Create new env file with Redis configuration
        $redisEnvConfig | Set-Content -Path $envPath
        Write-Success "Created $envFile with Redis configuration"
    }
}

#############################################################
# 4. Create encryption service if it doesn't exist
#############################################################
Write-Info "Checking for encryption service..."

$encryptionServicePath = Join-Path $projectRoot "src\services\encryptionService.ts"
if (-not (Test-Path $encryptionServicePath)) {
    $encryptionServiceContent = @"
/**
 * Encryption Service
 * 
 * Provides encryption and decryption functions for sensitive data
 * stored in Redis. Uses AES encryption from crypto-js.
 */
import CryptoJS from 'crypto-js';

// Get encryption key from environment variable
const getEncryptionKey = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VUE_APP_REDIS_ENCRYPTION_SECRET || 'default-encryption-key-change-me';
  }
  
  // For browser environment
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return (window as any).ENV.VUE_APP_REDIS_ENCRYPTION_SECRET || 'default-encryption-key-change-me';
  }
  
  return 'default-encryption-key-change-me';
};

/**
 * Encrypts a string value
 */
export function encrypt(value: string): string {
  if (!value) return value;
  
  try {
    const key = getEncryptionKey();
    return CryptoJS.AES.encrypt(value, key).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return value;
  }
}

/**
 * Decrypts an encrypted string value
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;
  
  try {
    const key = getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedValue, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt value');
  }
}

export default {
  encrypt,
  decrypt
};
"@

    New-Item -ItemType File -Path $encryptionServicePath -Force | Out-Null
    Set-Content -Path $encryptionServicePath -Value $encryptionServiceContent
    Write-Success "Created encryption service at $encryptionServicePath"
} else {
    Write-Info "Encryption service already exists at $encryptionServicePath"
}

#############################################################
# 5. Generate documentation
#############################################################
Write-Info "Generating documentation..."

$docsFolder = Join-Path $projectRoot "docs"
if (-not (Test-Path $docsFolder)) {
    New-Item -ItemType Directory -Path $docsFolder | Out-Null
}

$migrationDocPath = Join-Path $docsFolder "redis-migration.md"
$migrationDocContent = @"
# Pinia to Redis Migration Guide

## Overview

This document outlines the migration from Pinia to Redis for front-end state management in the LM Studio Agents application. The migration enhances state persistence, real-time synchronization, and enables multi-tab support while maintaining the same interface structure.

## Changes Made

1. **Redis Storage Layer**
   - Added Redis client service with proper connection management
   - Implemented data encryption for sensitive information
   - Added pub/sub for real-time updates across tabs
   - Implemented proper error handling and fallback mechanisms

2. **Store Implementation**
   - Replaced Pinia auth store with Redis-backed implementation
   - Replaced Pinia settings store with Redis-backed implementation
   - Maintained the same interface for backward compatibility
   - Added additional features like cross-tab synchronization

3. **Dependency Changes**
   - Removed: pinia, pinia-plugin-persistedstate
   - Added: redis, crypto-js
   - Added types: @types/redis, @types/crypto-js

4. **Configuration**
   - Added Redis connection settings in .env files
   - Added encryption configuration
   - Created centralized Redis configuration module

## Usage for Developers

### Environment Configuration

Ensure your .env file contains the following Redis configuration:

\`\`\`
VUE_APP_REDIS_URL=redis://localhost:6379
VUE_APP_REDIS_USERNAME=
VUE_APP_REDIS_PASSWORD=
VUE_APP_REDIS_TLS=false
VUE_APP_REDIS_ENCRYPTION_ENABLED=true
VUE_APP_REDIS_ENCRYPTION_SECRET=your-secure-secret-key
\`\`\`

### Using the stores

The stores maintain the same interface as before:

\`\`\`typescript
// Import Redis-backed stores
import { useAuthStore } from '@/store';
import { useSettingsStore } from '@/store';

// Use in component setup
export default {
  setup() {
    const authStore = useAuthStore();
    const settingsStore = useSettingsStore();

    // Use stores normally - API is the same as before
    const login = () => {
      // ...authentication logic
    };

    const updateSettings = (newSettings) => {
      settingsStore.updateSettings(newSettings);
    };

    return {
      // ...
    };
  }
};
\`\`\`

### New Features

#### Cross-tab Synchronization

State changes are now synchronized across browser tabs automatically. No additional code is required.

#### Error Handling

The Redis-backed stores include better error handling and fallback mechanisms:

\`\`\`typescript
// Listen for Redis connection errors
window.addEventListener('redis:connection:failed', (event) => {
  // Handle connection failure
  console.error('Redis connection failed:', event.detail);
});

// Listen for Redis connection restoration
window.addEventListener('redis:connection:restored', () => {
  // Handle connection restoration
  console.log('Redis connection restored');
});
\`\`

