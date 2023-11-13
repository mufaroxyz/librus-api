# ⚠️ WARNING: THIS API WRAPPER IS STILL IN DEVELOPMENT AND IS NOT PRODUCTION READY

# librus-api
A fully functional Librus API wrapper with typescript support.

### Disclaimer
This project was inspired by an [https://github.com/Mati365/librus-api](Existing API Wrapper) for librus but it's not working anymore so I'm making a new version with typescript support and with full functionality
❗ You're using this API Wrapper on you own responsibility. Librus most likely doesn't allow for making third party applications using their webscraped API.

# Usage (Not finished and might be wrong)
```ts
import { LibrusClient } from "librus-api"

const client = new LibrusClient()
client.login("username", "password")

/**  Quick Examples  */
// Get account info
const accountInfo = await client.info.getAccountInfo();

// Get grades (That is not working fully yet.)
const grades = await client.info.getGrades();
```