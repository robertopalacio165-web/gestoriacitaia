import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Mock API responses for the UI since we don't have a real backend specified
const MOCK_DELAY = 800;

export interface Appointment {
  id: string;
  type: string;
  status: 'pending' | 'scheduled' | 'completed';
  date?: string;
  location?: string;
}

export function useAppointments() {
  return useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async (): Promise<Appointment[]> => {
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
      // Returning empty by default to match "No hay citas programadas" state
      return [];
    },
  });
}

export function useScheduleAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { type: string }) => {
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
      // Simulate API call to schedule
      if (!data.type) throw new Error("Trámite es requerido");
      return { success: true, appointmentId: `apt_${Math.random().toString(36).substr(2, 9)}` };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
  });
}
