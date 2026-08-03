# SITC One V2.0 Mobile First

SITC One V2.0 is a single responsive project for mobile and desktop. It keeps the V1.9.3 shipping functions and adds an app-style mobile interface plus PWA installation.

## V2.0 Mobile First

- One codebase for phone and PC
- App-style mobile header and bottom tab bar
- Full-screen interactive map mode
- Schedule, freight, Agreement, CVM route, tracking, booking and customer account access
- Chinese/English and light/dark modes
- PWA manifest, icons and service-worker cache
- Existing admin and cloud integration structure retained

### Run locally

Serve this directory with any static web server. Opening `index.html` directly works for basic preview, but PWA/service-worker features require HTTP or HTTPS.

### Deploy

Upload the complete directory to GitHub Pages or another static host. Keep all relative paths unchanged. Configure `assets/config.js` when production Supabase services are ready.

## V1.9.3 更新

- 左侧功能区“航线”下方新增 **CVM 航线展示图**。
- 航线顺序按要求显示：Kuching → Ho Chi Minh → Qinzhou → Nansha → Shekou → Ho Chi Minh → Batam → Kuching。
- 已在系统开通的目的港支持点击后直接切换查询；其余港口保留为靠泊顺序展示。

## V1.9.2 更新

- “运价导出 Excel”无需输入协议号时导出公开表价；输入有效协议号时导出客户协议价。
- 浅色地图与左右功能区已重新配色，地图海洋区域和功能区边界更明显。
- 船期列表删除重复船名、价格和 FT，详细报价仍显示在右侧结果卡。
- 页面中的小标题、说明文字和中转信息已统一放大。

## V1.9.1 修复

- 复制报价现在包含一程、二程及后续每一程船名航次。
- 切换目的港后，地图船舶会立即切换到新航线并重新开始动态行驶。
- 深色模式目的港选择列表已统一为深色。

## V1.9 更新

- 深色地图港口切换已改为复用线路图层和智能地图适配，降低闪屏与卡顿。
- “船期表导出 Excel”采用按目的港分组模板，并附带中转航段明细工作表。
- 所有客户 Excel 导出均固定显示中文和英文。


## V1.8 单文件兼容

V1.8 已将订舱和客户登录界面的样式内联到 `index.html`。即使只单独打开或上传
`index.html`，订舱抽屉和客户登录弹窗也会保持完整排版，不再依赖外部 CSS 文件。
云端登录和真实邮件发送仍需要正确配置 `assets/config.js`、Supabase 与邮件服务。

## Previous project documentation V1.7 · Agreement, Export & Booking Fixes

V1.6 builds on the V1.5 booking project and adds customer accounts, customer email routing, multiple carrier recipients and an automatically numbered temporary B/L.

## Customer experience

Public schedule and rate search remains available without signing in. A customer must sign in before submitting a booking.

The customer account settings include:

- customer company name;
- customer code, used in the temporary B/L, for example `TGL`;
- one booking Reply-To email;
- multiple customer CC emails;
- contact person and phone;
- default shipper name.

The booking form continues to support local browser templates. Templates are now separated by the signed-in customer account on the same device.

## Booking email routing

A submitted booking is sent to:

- all carrier **To** recipients configured in the admin settings;
- all carrier **CC** recipients configured in the admin settings;
- the customer Reply-To email;
- all customer CC emails;
- the booking contact email when it is different.

The email uses the customer Reply-To address, so the carrier can reply directly to the customer. Everyone can use **Reply All** to continue the booking discussion in the same email thread.

### Important sender-domain rule

The technical `From` address must use the domain verified in Resend. An arbitrary customer mailbox cannot safely be used as the real `From` address unless that customer's domain is separately verified and authorised.

The project therefore sends as:

```text
Customer Name via SITC One <booking@your-verified-domain.com>
```

and sets:

```text
Reply-To: customer-configured-email@example.com
```

This avoids SPF/DKIM spoofing failures while preserving the customer as the reply destination.

## Temporary B/L number

Each successful booking gets a temporary B/L number before the carrier issues the official ocean B/L.

Format:

```text
CUSTOMER-ORIGIN-DESTINATION-0001
```

Example:

```text
TGLKCHSHA0001
```

The four-digit sequence increments independently for each:

- customer account;
- origin;
- destination.

The sequence supports `0001` through `9999`. The temporary B/L appears in:

- the booking success message;
- the booking email subject;
- the booking email body;
- the admin booking list and detail;
- CSV exports.

## Admin email settings

The admin **System Settings** page now supports:

- multiple primary carrier recipient emails;
- multiple carrier CC emails;
- enable or disable booking email delivery.

The default primary recipient is:

```text
zhongbenchao@sitc.com
```

## Database upgrade

### Existing V1.5 project

Run:

```text
sql/v1_6_customer_login_temp_bl.sql
```

### New project

Run:

1. `sql/schema.sql`
2. `sql/seed.sql`
3. `sql/create_admin.sql` after replacing the admin email

The V1.6 migration creates:

- `customer_profiles`;
- `temporary_bl_sequences`;
- new customer/email/temp-BL fields on `booking_requests`;
- RLS policies for customers to manage their own profile and read their own bookings;
- the `next_temporary_bl_no` database function;
- multiple carrier To/CC settings.

## Supabase Auth setup

In Supabase Authentication settings:

1. Enable email/password sign-up.
2. Set the production Site URL.
3. Add the GitHub Pages URL to Redirect URLs.
4. Keep email confirmation enabled for production, or disable it temporarily during local testing.

Customers can register directly from the customer account button in `index.html`.

## Edge Function deployment

V1.6 requires a valid customer JWT. Deploy without `--no-verify-jwt`:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy submit-booking
```

The project `supabase/config.toml` contains:

```toml
[functions.submit-booking]
verify_jwt = true
```

## Email secrets

Set the Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set BOOKING_FROM_EMAIL=booking@your-verified-domain.com
supabase secrets set BOOKING_RECIPIENT_EMAIL=zhongbenchao@sitc.com
```

`BOOKING_RECIPIENT_EMAIL` is only a fallback. The admin settings control the actual carrier To and CC lists.

If Resend is not configured, the booking and temporary B/L are still saved, and the customer receives a clear warning that email was not sent.

## Front-end configuration

Copy `assets/config.example.js` to `assets/config.js` and set:

```js
window.SITC_CLOUD_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "YOUR_PUBLISHABLE_KEY",
  adminPath: "./admin.html",
  bookingFunctionName: "submit-booking"
};
```

Only use the publishable key in browser files. Never place the service-role key or Resend API key in the front end.

## Test flow

1. Apply the V1.6 SQL migration.
2. Deploy the JWT-protected Edge Function.
3. Configure Resend secrets.
4. In admin settings, enter `zhongbenchao@sitc.com` as a carrier To recipient and add test carrier CC addresses.
5. Register a customer account.
6. Confirm the customer email, sign in and save company, customer code, Reply-To and customer CC addresses.
7. Select a schedule and submit a booking.
8. Confirm the success message contains both the booking request number and temporary B/L.
9. Confirm every carrier and customer recipient receives the email.
10. Use Reply All and confirm the customer Reply-To and all CC recipients remain in the conversation.

## Main files

- `index.html` — customer front end, login, settings and booking
- `admin.html` — carrier admin dashboard
- `assets/customer-account.css` — customer account UI
- `sql/v1_6_customer_login_temp_bl.sql` — upgrade migration
- `supabase/functions/submit-booking/index.ts` — authenticated booking and email function
- `docs/CUSTOMER_LOGIN_EMAIL_FLOW.md` — detailed email and temporary B/L flow


## V1.7 修复与新增

- 临时 B/L 改为无连接符格式，例如 `TGLKCHTYO0001`。既有云端项目需执行 `sql/v1_7_temp_bl_format.sql`。
- 云端未配置或协议 RPC 暂不可用时，网页可用本地测试协议 `MYJXTGL001` 验证协议价和运价导出功能。正式生产仍建议由 Supabase 返回协议价。
- 左侧新增“船期表导出 Excel”，包含船期总览和分段中转方案两个工作表。
- “导出 Excel”更名为“运价导出 Excel”。
- 左侧功能区增加对比度并放大航线、起始日期、协议号等小标题。
- 一键订舱按钮修复：选中船期即可打开订舱抽屉并填写箱型箱量、发货人、品名、HS、重量和联系人。提交时才要求客户登录及完成邮箱设置。
