#!/usr/bin/env bash
# End-to-end API flow test for Hotel Growth OS
set -euo pipefail

BASE="${API_URL:-http://localhost:5001/api/v1}"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "✅ $name"
    PASS=$((PASS + 1))
  else
    echo "❌ $name"
    echo "   Expected pattern: $expected"
    echo "   Got: $(echo "$actual" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " Hotel Growth OS — E2E API Flow Test"
echo " Base URL: $BASE"
echo "========================================"
echo ""

# 1. Health
HEALTH=$(curl -s "http://localhost:5001/health")
check "Health check" '"success":true' "$HEALTH"

# 2. Login as hotel owner
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demohotel.com","password":"Owner@123456"}')
check "Hotel owner login" '"success":true' "$LOGIN"

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'])" 2>/dev/null || echo "")
HOTEL_ID=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['user'].get('hotelId',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "❌ Could not extract token — aborting"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"
HOTEL="x-hotel-id: $HOTEL_ID"

# 3. Profile
PROFILE=$(curl -s "$BASE/auth/profile" -H "$AUTH")
check "Get profile" 'hotel_owner' "$PROFILE"

# 4. List hotels
HOTELS=$(curl -s "$BASE/hotels?page=1&limit=5" -H "$AUTH")
check "List hotels" '"success":true' "$HOTELS"

# 5. Room types
RT=$(curl -s "$BASE/room-types?page=1&limit=10" -H "$AUTH" -H "$HOTEL")
check "List room types" '"success":true' "$RT"

# 6. Rooms
ROOMS=$(curl -s "$BASE/rooms?page=1&limit=10" -H "$AUTH" -H "$HOTEL")
check "List rooms" '"success":true' "$ROOMS"

ROOM_ID=$(echo "$ROOMS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',{}).get('data',[])
print(items[0]['_id'] if items else '')
" 2>/dev/null || echo "")

# 7. Enquiries
ENQ=$(curl -s "$BASE/enquiries?page=1&limit=10" -H "$AUTH" -H "$HOTEL")
check "List enquiries" '"success":true' "$ENQ"

# Create enquiry
NEW_ENQ=$(curl -s -X POST "$BASE/enquiries" -H "$AUTH" -H "$HOTEL" \
  -H "Content-Type: application/json" \
  -d '{"guestName":"Test Guest","phone":"9999888877","source":"website","guestsCount":2,"status":"new"}')
check "Create enquiry" '"success":true' "$NEW_ENQ"

ENQ_ID=$(echo "$NEW_ENQ" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null || echo "")

# 8. Guests — create
NEW_GUEST=$(curl -s -X POST "$BASE/guests" -H "$AUTH" -H "$HOTEL" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Guest","phone":"9999888877","email":"testguest@example.com"}')
check "Create guest" '"success":true' "$NEW_GUEST"

GUEST_ID=$(echo "$NEW_GUEST" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null || echo "")

# 9. Available rooms
CHECKIN=$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d '+7 days' +%Y-%m-%d 2>/dev/null || echo "2026-07-01")
CHECKOUT=$(date -v+9d +%Y-%m-%d 2>/dev/null || date -d '+9 days' +%Y-%m-%d 2>/dev/null || echo "2026-07-03")

AVAIL=$(curl -s "$BASE/bookings/available-rooms?checkInDate=${CHECKIN}T14:00:00.000Z&checkOutDate=${CHECKOUT}T11:00:00.000Z" \
  -H "$AUTH" -H "$HOTEL")
check "Check room availability" '"success":true' "$AVAIL"

# 10. Create booking
if [ -n "$GUEST_ID" ] && [ -n "$ROOM_ID" ]; then
  BOOKING=$(curl -s -X POST "$BASE/bookings" -H "$AUTH" -H "$HOTEL" \
    -H "Content-Type: application/json" \
    -d "{\"guestId\":\"$GUEST_ID\",\"checkInDate\":\"${CHECKIN}T14:00:00.000Z\",\"checkOutDate\":\"${CHECKOUT}T11:00:00.000Z\",\"adults\":2,\"children\":0,\"totalAmount\":8000,\"roomIds\":[\"$ROOM_ID\"],\"enquiryId\":\"$ENQ_ID\"}")
  check "Create booking" '"success":true' "$BOOKING"

  BOOKING_ID=$(echo "$BOOKING" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null || echo "")

  # 11. Record cash payment
  if [ -n "$BOOKING_ID" ]; then
    PAY=$(curl -s -X POST "$BASE/payments/cash" -H "$AUTH" -H "$HOTEL" \
      -H "Content-Type: application/json" \
      -d "{\"bookingId\":\"$BOOKING_ID\",\"guestId\":\"$GUEST_ID\",\"amount\":4000,\"notes\":\"Advance payment\"}")
    check "Record cash payment" '"success":true' "$PAY"

    # 12. Confirm booking
    STATUS=$(curl -s -X PATCH "$BASE/bookings/$BOOKING_ID/status" -H "$AUTH" -H "$HOTEL" \
      -H "Content-Type: application/json" \
      -d '{"status":"confirmed"}')
    check "Confirm booking" '"success":true' "$STATUS"
  fi
else
  echo "⚠️  Skipped booking flow (missing guest/room IDs)"
fi

# 13. Dashboard
DASH=$(curl -s "$BASE/dashboard" -H "$AUTH" -H "$HOTEL")
check "Dashboard summary" '"success":true' "$DASH"

# 14. Reports
REV=$(curl -s "$BASE/reports/revenue?from=2026-01-01&to=2026-12-31" -H "$AUTH" -H "$HOTEL")
check "Revenue report" '"success":true' "$REV"

# 15. Staff list
STAFF=$(curl -s "$BASE/staff?page=1&limit=5" -H "$AUTH" -H "$HOTEL")
check "List staff" '"success":true' "$STAFF"

# 16. WhatsApp messages
WA=$(curl -s "$BASE/whatsapp/messages?page=1&limit=5" -H "$AUTH" -H "$HOTEL")
check "WhatsApp inbox" '"success":true' "$WA"

# 17. Super admin login
ADMIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotelgrowthos.com","password":"Admin@123456"}')
check "Super admin login" 'super_admin' "$ADMIN"

# 18. Calendar
CAL=$(curl -s "$BASE/bookings/calendar?startDate=2026-06-01&endDate=2026-12-31" -H "$AUTH" -H "$HOTEL")
check "Booking calendar" '"success":true' "$CAL"

echo ""
echo "========================================"
echo " Results: $PASS passed, $FAIL failed"
echo "========================================"

[ "$FAIL" -eq 0 ]
