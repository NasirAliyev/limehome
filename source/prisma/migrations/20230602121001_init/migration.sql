-- CreateTable
CREATE TABLE "Booking" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guestName" TEXT NOT NULL,
    "unitID" TEXT NOT NULL,
    "checkInDate" DATETIME NOT NULL,
    "numberOfNights" INTEGER NOT NULL
);
