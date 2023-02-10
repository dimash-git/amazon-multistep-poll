Form page that checks customer Order for avaliable Gifts using DataSellerTools API.

How it works?
1. User enters his full name and order id. Then via order id info about purchase date and asin are fetched.
If there is no such order, error message is showed as well as for the cases when purchase date is less than 7 days.
2. In the next step, user chooses gift offer and gift name afterwards is store in form data.
3. User rates his order and leave review if he wishes so. 
   * If 3 or less stars -> switch immediately to Client Form
   * If 4 or more stars -> 
      - If commentary was left, enable both Paste and Leave review buttons
      - If commentary was not left, enable only Leave review button
4. * Leave review or Continue without review -> 7 second pause -> switch to Client Form
5. Fill out Client Information and submit. Information is then posted to Google Sheet
6. Show Thank You panel.

Full Flow diagram: https://www.figma.com/file/8NvHcuxgtQg74FXqyTaePK/Flow?node-id=0%3A1&t=reaXtVS0bGNjRY8o-1 <br>
Google Sheet: https://docs.google.com/spreadsheets/d/1xx_SAGfwbV-cssRkhiFtCfU1Y_ZKb3EI-0g1Y7Q8o4c/
