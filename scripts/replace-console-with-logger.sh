#!/data/data/com.termux/files/usr/bin/bash
# PRODUCTION SCRIPT: Replace all console.* with proper logger
# This script MUST be run to make codebase production-ready

echo "🔧 REPLACING CONSOLE STATEMENTS WITH ENTERPRISE LOGGER"
echo "=================================================="
echo ""

# Files to process
FILES=$(find mining-engine services bot blockchain -name "*.js" 2>/dev/null)

total_replaced=0

for file in $FILES; do
  if [ ! -f "$file" ]; then
    continue
  fi

  # Check if file has console statements
  count=$(grep -c "console\." "$file" 2>/dev/null || echo 0)

  if [ "$count" -gt 0 ]; then
    echo "📝 Processing: $file ($count statements)"

    # Backup original
    cp "$file" "${file}.backup"

    # Determine context logger based on directory
    if [[ "$file" == *"mining-engine"* ]]; then
      logger_context="mining"
    elif [[ "$file" == *"services"* ]]; then
      logger_context="app"
    elif [[ "$file" == *"bot"* ]]; then
      logger_context="bot"
    elif [[ "$file" == *"blockchain"* ]]; then
      logger_context="blockchain"
    else
      logger_context="app"
    fi

    # Check if logger is already required
    if ! grep -q "require.*utils/logger" "$file"; then
      # Add logger require at top after other requires
      sed -i "1a const logger = require('../utils/logger').loggers.$logger_context;" "$file"
    fi

    # Replace console.log with logger.info
    sed -i "s/console\.log(/logger.info(/g" "$file"

    # Replace console.error with logger.error
    sed -i "s/console\.error(/logger.error(/g" "$file"

    # Replace console.warn with logger.warn
    sed -i "s/console\.warn(/logger.warn(/g" "$file"

    # Replace console.debug with logger.debug
    sed -i "s/console\.debug(/logger.debug(/g" "$file"

    total_replaced=$((total_replaced + count))
    echo "   ✅ Replaced $count statements"
  fi
done

echo ""
echo "=================================================="
echo "✅ COMPLETE: Replaced $total_replaced console statements"
echo "📦 Backups created with .backup extension"
echo ""
echo "Next steps:"
echo "1. Test the changes: pm2 restart fastap-bot"
echo "2. If OK: rm **/*.backup"
echo "3. If issues: restore from backups"
echo ""
