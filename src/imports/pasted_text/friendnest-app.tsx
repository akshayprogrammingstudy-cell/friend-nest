Build a complete working responsive web app called **FriendNest**.

FriendNest is a private website only for two people: me and my friend. Do not create public signup, room creation, join room, invite link, room code, multiple rooms, or room dashboard features. This app should be simple, private, emotional, secure, and useful only for two users.

Website Name:
FriendNest

Tagline:
Our private space for chats, tasks, memories, and achievements.

Main Goal:
Create a private two-person website where only me and my friend can log in using password-based login. After login, both of us can chat, create tasks, upload certificates, share media, save memories, and see a special birthday surprise for Aishwarya on July 3.

Important:

* Remove create room concept.
* Remove join room concept.
* Remove invite link concept.
* Remove room code concept.
* Remove multiple-room dashboard.
* This website is only for me and Aishwarya.
* Use password-based login.
* Only two allowed users should be able to access the website.
* After login, go directly to the main private dashboard.
* If the logged-in user name is Aishwarya and the date is July 3, show the birthday surprise page automatically after login.

Tech Stack:
Use React, Tailwind CSS, and Supabase.

Use Supabase for:

* User authentication
* Database
* Realtime chat
* Task storage
* Certificate storage
* Media storage
* Memories storage

User Access:
Create a secure login page with:

* Name field
* Email field
* Password field
* Login button
* Error message for wrong login
* Private access message

Only two users should be allowed:

* User 1: Me
* User 2: Aishwarya

Use placeholders:

* MY_EMAIL_HERE
* AISHWARYA_EMAIL_HERE

If any other email tries to log in, show:
“This website is private and only available for two users.”

Login Page:
Design a beautiful private login page.

Include:

* FriendNest logo
* Website name: FriendNest
* Tagline
* Name input
* Email input
* Password input
* Login button
* Soft welcome message
* Lock icon
* Privacy message: “Private space only for us.”
* Responsive mobile and desktop layout

After Login Flow:
After successful login:

* Check the logged-in user’s name.
* If the user name is Aishwarya and today’s date is July 3, show the birthday surprise page first.
* If the user name is not Aishwarya, go directly to the dashboard.
* If the date is not July 3, go directly to the dashboard.
* Add a small “Preview Birthday Surprise” button only for testing during development.

Birthday Condition:
If `user.name === "Aishwarya"` and today is July 3, show the birthday page.

Main Dashboard:
Create a clean private dashboard with cards for:

* Chat
* Tasks
* Certificates
* Shared Media
* Memories
* Birthday Memory
* Profile / Settings

Dashboard should show:

* Welcome message
* Recent message preview
* Pending task count
* Recently uploaded certificates
* Recent memories
* Quick action buttons
* Recent activity section

Chat Feature:
Create a WhatsApp-like private chat page for only two users.

Features:

* Real-time messages
* Message bubbles for both users
* Text messages
* Image sharing
* Video sharing
* File sharing
* PDF/document sharing
* Timestamp
* Seen/delivered style UI
* Typing indicator
* Online/offline status
* Emoji button
* Attachment button
* Message input bar
* Search messages
* Delete message option
* Pin important messages

The chat should be simple, private, smooth, and mobile-friendly.

Task Feature:
Create a shared task management page.

Both users can:

* Create tasks
* Assign task to self
* Assign task to Aishwarya
* Assign task to both users
* Add task title
* Add description
* Add due date
* Set priority: Low, Medium, High
* Add attachment
* Mark task as completed
* Reopen completed task
* Delete task

Task sections:

* My Tasks
* Aishwarya’s Tasks
* Shared Tasks
* Due Today
* Important Tasks
* Completed Tasks

Each task card should show:

* Task title
* Description preview
* Created by
* Assigned to
* Due date
* Priority badge
* Status: Pending / In Progress / Completed
* Completion checkbox

Certificate Storage Feature:
Create a private certificate vault.

Both users can:

* Upload course certificates
* Upload PDF/image certificates
* Add certificate title
* Add course name
* Add issuing organization
* Add completion date
* Add tags
* Preview certificate
* Download certificate
* Share certificate link
* Delete certificate
* Edit certificate details

Certificate page should include:

* Upload Certificate button
* Certificate grid
* Search certificates
* Filter by course/platform
* Filter by date
* View certificate details
* Share button
* Download button

Certificate detail page should include:

* Full certificate preview
* Certificate title
* Course name
* Issued by
* Completion date
* Tags
* Share link button
* Download button

Shared Media Feature:
Create a shared media gallery.

Include:

* Photos
* Videos
* Documents
* PDFs
* Shared files
* Upload button
* File type filters
* Preview option
* Download option
* Search media
* Date-based grouping

Memories Feature:
Create a memories page for both users.

Features:

* Add memory button
* Add photo memory
* Add note memory
* Add special date
* Favorite memory option
* Timeline layout
* Memory cards
* Birthday memories saved here after July 3

Memory card should show:

* Memory title
* Date
* Photo/thumbnail
* Short note
* Favorite icon

Birthday Surprise Feature:
Create a special birthday surprise for Aishwarya.

Important behavior:

* The birthday surprise should appear when Aishwarya logs in to the website on July 3.
* It should appear automatically after login.
* It should be shown only when the logged-in user name is Aishwarya.
* It should be visible only for the full day of July 3.
* On other days, it should not appear automatically.
* After July 3, save it as a birthday memory inside the Memories page.
* Add a small “Preview Birthday Surprise” button only for testing during development.

Birthday Surprise Page Design:
Create a full-screen animated birthday page with:

* Confetti animation
* Balloons
* Cake illustration
* Floating hearts
* Soft glowing background
* Animated birthday text
* Button: “Open My Surprise”
* Button: “Go to Dashboard”

Birthday Message:
“Happy Birthday Aishwarya! Today is all about you. I hope this year brings you happiness, success, peace, and all the beautiful things you truly deserve. Thank you for being such a special person in my life.”

After clicking “Open My Surprise,” show a birthday card page.

Birthday Card Page:
Include:

* Animated birthday card
* Photo/memory placeholder
* Heartfelt message section
* Music button UI
* Floating hearts/confetti
* Save this memory button
* Go to dashboard button

Birthday Card Message:
“Happy Birthday Aishwarya! You are truly special, and I hope this day brings a big smile to your face. May this year be filled with success, happiness, peace, and beautiful memories. Thank you for being an amazing person in my life.”

Profile and Settings Page:
Create a simple profile/settings page.

Include:

* Profile picture
* Name
* Email
* Edit profile option
* Change password option
* Theme setting
* Light mode / dark mode
* Notification settings
* Logout button

Extra Features:
Add these useful features:

* Notifications for new messages
* Notifications for assigned tasks
* Reminder alerts for pending tasks
* Pinned notes
* Favorite messages
* Search across chat, tasks, certificates, and media
* Dark mode and light mode
* Online/offline status
* Typing indicator
* Recent activity section
* Simple calendar for task deadlines and special dates
* Smooth animations
* Beautiful empty states

Design Style:
Use a clean, modern, soft, emotional, and friendly UI.

Color palette:

* Lavender
* Light blue
* Soft pink
* White
* Soft gray

UI style:

* Rounded cards
* Soft shadows
* Smooth spacing
* Clean icons
* Friendly illustrations
* Private and secure feeling
* Minimal but beautiful layout

The website should feel like:

* WhatsApp for private chatting
* Notion for tasks
* Google Drive for certificates and media
* A personal memory app for emotional moments

Responsive Design:
Create desktop and mobile responsive layouts.

Desktop:

* Sidebar navigation
* Large dashboard cards
* Wide chat layout
* Clean table/card views

Mobile:

* Bottom navigation bar
* Full-screen chat
* Mobile-friendly cards
* Large tap-friendly buttons
* Responsive forms
* Smooth mobile transitions

Required Pages:
Create these pages:

* Login page
* Main dashboard
* Chat page
* Tasks page
* Certificates page
* Certificate detail page
* Shared media page
* Memories page
* Birthday surprise page
* Birthday card page
* Profile/settings page

Database Tables:
Create database structure for:

* users
* messages
* tasks
* certificates
* media_files
* memories
* pinned_items
* birthday_memories

Security Rules:

* Only two allowed users can access the app.
* Users can only see data from this private app.
* Do not make any public pages except login.
* Uploaded files should be private by default.
* Only logged-in allowed users can view certificates, media, messages, tasks, and memories.
* Any email other than MY_EMAIL_HERE and AISHWARYA_EMAIL_HERE should be blocked.

Final Goal:
Build FriendNest as a complete private two-person website. It should not have rooms, invite links, join room, create room, or room codes. It should have only password login, then direct access to the private dashboard. The website should allow me and Aishwarya to chat, create shared tasks, upload certificates, share media, save memories, and show a beautiful animated birthday surprise to Aishwarya when she logs in on July 3.
