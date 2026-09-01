/**
 * PDF Export Service
 * 
 * Generates a formatted PDF document from an itinerary using jsPDF.
 * Uses dynamic import to lazy load jsPDF only when export is triggered,
 * reducing initial bundle size significantly.
 * 
 * Features:
 * - 3-day itinerary layout with all place details
 * - Trip summary with total duration and statistics
 * - Consistent branding and styling
 * - Place information including name, address, hours, duration
 * - Proper page breaks and formatting
 * - Lazy loading of jsPDF library (~800KB unminified)
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 13.1, 13.5**
 */

import { Itinerary, Place } from '../types';

// jsPDF will be dynamically imported when needed
type jsPDF = any; // Placeholder for type checking

interface TripStats {
  totalPlaces: number;
  totalDuration: number;
  citiesVisited: Set<string>;
  placeTypeBreakdown: Map<string, number>;
  avgRating: number;
}

/**
 * Calculate statistics for the entire trip
 */
function calculateTripStats(itinerary: Itinerary): TripStats {
  const allPlaces: Place[] = [];
  let totalDuration = 0;
  const citiesVisited = new Set<string>();
  const placeTypeBreakdown = new Map<string, number>();
  let totalRating = 0;
  let ratedPlacesCount = 0;

  // Collect all places and statistics
  itinerary.days.forEach((day) => {
    day.places.forEach((place) => {
      // Track unique places (avoid double counting if a place appears in multiple days)
      const isAlreadyAdded = allPlaces.some((p) => p.id === place.id);
      if (!isAlreadyAdded) {
        allPlaces.push(place);
      }

      totalDuration += place.duration_minutes || 60;
      citiesVisited.add(place.city);

      // Track place types
      const count = placeTypeBreakdown.get(place.type) || 0;
      placeTypeBreakdown.set(place.type, count + 1);

      // Track ratings
      if (place.rating) {
        totalRating += place.rating;
        ratedPlacesCount++;
      }
    });
  });

  return {
    totalPlaces: allPlaces.length,
    totalDuration,
    citiesVisited,
    placeTypeBreakdown,
    avgRating: ratedPlacesCount > 0 ? totalRating / ratedPlacesCount : 0,
  };
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

/**
 * Format place type for display (convert snake_case to Title Case)
 */
function formatPlaceType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Add header with branding to each page
 */
function addHeader(doc: jsPDF, pageNumber: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add a subtle header bar
  doc.setFillColor(59, 130, 246); // Blue-600
  doc.rect(0, 0, pageWidth, 15, 'F');
  
  // Add title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Italy Trip Planner', 15, 10);
  
  // Add page number
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNumber}`, pageWidth - 30, 10);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
}

/**
 * Add footer with timestamp
 */
function addFooter(doc: jsPDF, _itinerary: Itinerary): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  
  const footerText = `Generated on ${new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;
  
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
}

/**
 * Add trip summary section
 */
function addTripSummary(doc: jsPDF, itinerary: Itinerary, stats: TripStats): number {
  let yPosition = 25;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(itinerary.name, 15, yPosition);
  yPosition += 10;
  
  // Summary stats box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Draw summary box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.roundedRect(15, yPosition, 180, 35, 3, 3, 'FD');
  
  yPosition += 8;
  
  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('Trip Duration:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDuration(stats.totalDuration), 60, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Places:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(stats.totalPlaces.toString(), 60, yPosition);
  
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Cities:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(Array.from(stats.citiesVisited).join(', '), 60, yPosition);
  
  yPosition += 7;
  if (stats.avgRating > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Avg Rating:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${stats.avgRating.toFixed(1)} / 5.0`, 60, yPosition);
  }
  
  yPosition += 15;
  return yPosition;
}

/**
 * Add a single day's itinerary
 */
function addDayItinerary(doc: jsPDF, dayNumber: number, places: Place[], startTime: string): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = dayNumber === 1 ? 85 : 25;
  
  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    const currentPage = (doc.internal.pages as unknown[]).length - 1;
    addHeader(doc, currentPage);
    yPosition = 25;
  }
  
  // Day header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue-600
  doc.text(`Day ${dayNumber}`, 15, yPosition);
  doc.setTextColor(0, 0, 0);
  
  yPosition += 8;
  
  // If no places, show empty state
  if (places.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No activities planned for this day', 20, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;
    return yPosition;
  }
  
  // Calculate running time for the day
  let currentTime = startTime;
  
  // Add each place
  places.forEach((place, index) => {
    // Check if we need a new page before adding place
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      const currentPage = (doc.internal.pages as unknown[]).length - 1;
      addHeader(doc, currentPage);
      yPosition = 25;
    }
    
    // Place container
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, yPosition, 195, yPosition);
    
    yPosition += 5;
    
    // Time and place number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99); // Gray-600
    doc.text(`${currentTime}`, 20, yPosition);
    doc.text(`${index + 1}.`, 45, yPosition);
    
    // Place name
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(place.name, 52, yPosition);
    
    yPosition += 6;
    
    // Place type and city
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${formatPlaceType(place.type)} • ${place.city}`, 52, yPosition);
    
    yPosition += 5;
    
    // Address (if neighborhood available)
    if (place.neighborhood) {
      doc.setFontSize(9);
      doc.text(`📍 ${place.neighborhood}`, 52, yPosition);
      yPosition += 5;
    }
    
    // Duration and hours
    const duration = place.duration_minutes || 60;
    const hours = place.hours || 'Hours not specified';
    doc.setFontSize(9);
    doc.text(`⏱️ Duration: ${formatDuration(duration)}`, 52, yPosition);
    yPosition += 5;
    doc.text(`🕐 Hours: ${hours}`, 52, yPosition);
    yPosition += 5;
    
    // Price range and rating
    if (place.price_range || place.rating) {
      let infoLine = '';
      if (place.price_range) {
        infoLine += `💰 ${place.price_range}`;
      }
      if (place.rating) {
        if (infoLine) infoLine += '  •  ';
        infoLine += `⭐ ${place.rating}/5`;
      }
      doc.text(infoLine, 52, yPosition);
      yPosition += 5;
    }
    
    // Booking required indicator
    if (place.booking_required) {
      doc.setTextColor(220, 38, 38); // Red-600
      doc.text('⚠️ Advance booking required', 52, yPosition);
      doc.setTextColor(100, 100, 100);
      yPosition += 5;
    }
    
    // Description (truncated if too long)
    if (place.description) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const maxWidth = 140;
      const lines = doc.splitTextToSize(place.description, maxWidth);
      // Limit to 2 lines
      const displayLines = lines.slice(0, 2);
      displayLines.forEach((line: string) => {
        doc.text(line, 52, yPosition);
        yPosition += 4;
      });
      if (lines.length > 2) {
        doc.text('...', 52, yPosition);
        yPosition += 4;
      }
      doc.setFont('helvetica', 'normal');
    }
    
    yPosition += 3;
    
    // Update current time for next activity
    const [hours_num, minutes] = currentTime.split(':').map(Number);
    const totalMinutes = hours_num * 60 + minutes + duration + 30; // 30 min buffer
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  });
  
  yPosition += 5;
  return yPosition;
}

/**
 * Export itinerary to PDF and trigger download
 * 
 * Uses dynamic import to lazy load jsPDF library (~800KB) only when needed.
 * This significantly reduces initial bundle size.
 * 
 * @param itinerary The itinerary to export
 * @returns Promise that resolves when PDF generation is complete
 */
export async function exportToPDF(itinerary: Itinerary): Promise<void> {
  try {
    // Dynamically import jsPDF to defer loading until export is triggered
    const { default: jsPDF } = await import('jspdf');
    
    // Create new PDF document (A4 size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Calculate trip statistics
    const stats = calculateTripStats(itinerary);
    
    // Page 1: Header + Summary
    addHeader(doc, 1);
    let yPosition = addTripSummary(doc, itinerary, stats);
    
    // Add days
    itinerary.days.forEach((day) => {
      yPosition = addDayItinerary(
        doc,
        day.day_number,
        day.places,
        day.start_time
      );
      
      // Add some space between days
      yPosition += 5;
    });
    
    // Add footer to all pages
    const pageCount = doc.internal.pages.length - 1; // Subtract the first null page
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addFooter(doc, itinerary);
    }
    
    // Generate filename from itinerary name and date
    const sanitizedName = itinerary.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedName}_${date}.pdf`;
    
    // Trigger download
    doc.save(filename);
    
    console.log('PDF exported successfully:', filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}
