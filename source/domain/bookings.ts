import { Booking } from '../repositories/bookingRepository';
import { DAY_IN_MILLISECONDS } from '../constants/time';

export interface BookingDomain {
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
}

export interface ExtendBookingDomain {
    additionalNights: number;
}

export type BookingOutcome = { result: boolean; reason: string };

export class BookingService {
    async checkSameGuestSameUnit(guestName: string, unitID: string, existingBookings: Booking[]): Promise<BookingOutcome> {
        const sameGuestSameUnit = existingBookings.filter(b => 
            b.guestName === guestName && b.unitID === unitID
        );
        if (sameGuestSameUnit.length > 0) {
            return { result: false, reason: "The given guest name cannot book the same unit multiple times" };
        }
        return { result: true, reason: "OK" };
    }

    async checkSameGuestMultipleUnits(guestName: string, existingBookings: Booking[]): Promise<BookingOutcome> {
        const sameGuestBookings = existingBookings.filter(b => b.guestName === guestName);
        if (sameGuestBookings.length > 0) {
            return { result: false, reason: "The same guest cannot be in multiple units at the same time" };
        }
        return { result: true, reason: "OK" };
    }

    async checkUnitAvailability(
        booking: BookingDomain,
        conflictingBookings: Booking[]
    ): Promise<BookingOutcome> {
        const requestedCheckInDate = new Date(booking.checkInDate);
        const requestedCheckOutDate = new Date(requestedCheckInDate.getTime() + booking.numberOfNights * DAY_IN_MILLISECONDS);

        const hasConflict = this.checkDateRangeOverlap(
            requestedCheckInDate,
            requestedCheckOutDate,
            conflictingBookings
        );

        if (hasConflict) {
            return { result: false, reason: "For the given check-in date, the unit is already occupied" };
        }

        return { result: true, reason: "OK" };
    }

    async isExtensionPossible(
        existingBooking: Booking,
        additionalNights: number,
        otherBookings: Booking[]
    ): Promise<BookingOutcome> {
        const existingCheckInDate = new Date(existingBooking.checkInDate);
        const newNumberOfNights = existingBooking.numberOfNights + additionalNights;
        const newCheckOutDate = new Date(existingCheckInDate.getTime() + newNumberOfNights * DAY_IN_MILLISECONDS);

        const conflictingBookings = otherBookings.filter(b => 
            b.unitID === existingBooking.unitID && b.id !== existingBooking.id
        );

        const hasConflict = this.checkDateRangeOverlap(
            existingCheckInDate,
            newCheckOutDate,
            conflictingBookings
        );

        if (hasConflict) {
            return { result: false, reason: "Extension conflicts with existing booking" };
        }

        return { result: true, reason: "OK" };
    }

    private checkDateRangeOverlap(
        requestedCheckInDate: Date,
        requestedCheckOutDate: Date,
        existingBookings: Booking[]
    ): boolean {
        for (let existingBooking of existingBookings) {
            const existingCheckInDate = new Date(existingBooking.checkInDate);
            const existingCheckOutDate = new Date(existingCheckInDate.getTime() + existingBooking.numberOfNights * DAY_IN_MILLISECONDS);
            
            // Check if the requested period overlaps with existing booking period
            if (requestedCheckInDate < existingCheckOutDate && requestedCheckOutDate > existingCheckInDate) {
                return true;
            }
        }
        return false;
    }
}
