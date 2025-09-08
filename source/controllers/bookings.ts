import { Request, Response, NextFunction } from 'express';
import { HttpStatusCode } from 'axios';
import { BookingService, BookingDomain, ExtendBookingDomain } from '../domain/bookings';
import { BookingRepository } from '../repositories/bookingRepository';
import { DAY_IN_MILLISECONDS } from '../constants/time';

const bookingService = new BookingService();
const bookingRepository = new BookingRepository();

const healthCheck = async (req: Request, res: Response, next: NextFunction) => {
    return res.status(HttpStatusCode.Ok).json({
        message: "OK"
    })
}

const createBooking = async (req: Request, res: Response, next: NextFunction) => {
    const booking: BookingDomain = req.body;

    // check 1 : The Same guest cannot book the same unit multiple times
    const sameGuestSameUnitBookings = await bookingRepository.findByGuestAndUnit(booking.guestName, booking.unitID);
    const sameGuestSameUnitResult = await bookingService.checkSameGuestSameUnit(booking.guestName, booking.unitID, sameGuestSameUnitBookings);
    if (!sameGuestSameUnitResult.result) {
        return res.status(HttpStatusCode.BadRequest).json(sameGuestSameUnitResult.reason);
    }

    // check 2 : the same guest cannot be in multiple units at the same time
    const sameGuestBookings = await bookingRepository.findByGuestName(booking.guestName);
    const sameGuestMultipleUnitsResult = await bookingService.checkSameGuestMultipleUnits(booking.guestName, sameGuestBookings);
    if (!sameGuestMultipleUnitsResult.result) {
        return res.status(HttpStatusCode.BadRequest).json(sameGuestMultipleUnitsResult.reason);
    }

    // check 3 : Unit is available for the check-in date
    const requestedCheckOutDate = new Date(new Date(booking.checkInDate).getTime() + booking.numberOfNights * DAY_IN_MILLISECONDS);
    const conflictingBookings = await bookingRepository.findByUnitIdBeforeDate(booking.unitID, requestedCheckOutDate);
    const unitAvailabilityResult = await bookingService.checkUnitAvailability(booking, conflictingBookings);
    if (!unitAvailabilityResult.result) {
        return res.status(HttpStatusCode.Conflict).json(unitAvailabilityResult.reason);
    }

    const bookingResult = await bookingRepository.create({
        guestName: booking.guestName,
        unitID: booking.unitID,
        checkInDate: new Date(booking.checkInDate),
        numberOfNights: booking.numberOfNights
    });

    return res.status(HttpStatusCode.Ok).json(bookingResult);
}

const extendBooking = async (req: Request, res: Response, next: NextFunction) => {
    const bookingId = parseInt(req.params.id);
    const extendRequest: ExtendBookingDomain = req.body;

    // Validate booking ID
    if (isNaN(bookingId)) {
        return res.status(HttpStatusCode.BadRequest).json("Invalid booking ID");
    }

    // Validate additional nights
    if (extendRequest.additionalNights <= 0) {
        return res.status(HttpStatusCode.BadRequest).json("Additional nights must be greater than 0");
    }

    try {
        // Find the existing booking
        const existingBooking = await bookingRepository.findById(bookingId);

        if (!existingBooking) {
            return res.status(HttpStatusCode.NotFound).json("Booking not found");
        }

        // Get conflicting bookings for the same unit (excluding current booking)
        const conflictingBookings = await bookingRepository.findByUnitIdExcludingBooking(
            existingBooking.unitID,
            bookingId
        );

        // Check if extension conflicts with other bookings
        const outcome = await bookingService.isExtensionPossible(
            existingBooking,
            extendRequest.additionalNights,
            conflictingBookings
        );

        if (!outcome.result) {
            return res.status(HttpStatusCode.Conflict).json(outcome.reason);
        }

        // Update the booking with extended nights
        const newNumberOfNights = existingBooking.numberOfNights + extendRequest.additionalNights;
        const updatedBooking = await bookingRepository.updateNumberOfNights(bookingId, newNumberOfNights);

        return res.status(HttpStatusCode.Ok).json(updatedBooking);

    } catch (error) {
        return res.status(HttpStatusCode.InternalServerError).json("Internal server error");
    }
}

export default { healthCheck, createBooking, extendBooking }
