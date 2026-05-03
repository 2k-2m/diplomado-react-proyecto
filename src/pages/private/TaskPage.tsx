import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useActionState, useEffect, useState } from 'react';
import { useAlert, useAxios } from '../../hooks';
import { createInitialState, handleZodErros } from '../../helpers';
import type { ActionState } from '../../interfaces';
import { z } from 'zod';



const schemaTask = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),
});
type TaskFormValues = z.infer<typeof schemaTask>;
type TaskActionState = ActionState<TaskFormValues>;


interface Task {
  id: number;
  name: string;
  done: boolean;
}

export const TaskPage = () => {
  const { showAlert } = useAlert();
  const axios = useAxios();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // load
  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await axios.get<{ data: Task[] }>('/tasks'); // error de tipo de objeto aca..
      setTasks(res.data.data);
    } catch {
      showAlert('Error al cargar las tareas', 'error');
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // crear o edit
  const initialState = createInitialState<TaskFormValues>();

  const saveTaskApi = async (
    _: TaskActionState | undefined,
    formData: FormData,
  ): Promise<TaskActionState | undefined> => {
    const rawData: TaskFormValues = {
      name: formData.get('name') as string,
    };
    try {
      schemaTask.parse(rawData);
      if (editingTask) {
        await axios.put(`/tasks/${editingTask.id}`, { name: rawData.name });
        showAlert('Tarea actualizada', 'success');
      } else {
        await axios.post('/tasks', { name: rawData.name });
        showAlert('Tarea creada', 'success');
      }
      setDialogOpen(false);
      setEditingTask(null);
      await fetchTasks();
    } catch (error) {
      const err = handleZodErros<TaskFormValues>(error, rawData);
      showAlert(err.message, 'error');
      return err;
    }
  };

  const [state, submitAction, isPending] = useActionState(
    saveTaskApi,
    initialState,
  );

  // delete
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/tasks/${id}`);
      showAlert('Tarea eliminada', 'success');
      await fetchTasks();
    } catch {
      showAlert('Error al eliminar', 'error');
    }
  };

  // estado 
  const handleToggleDone = async (task: Task) => {
    try {
      await axios.patch(`/tasks/${task.id}`, { done: !task.done });
      await fetchTasks();
    } catch {
      showAlert('Error al actualizar estado', 'error');
    }
  };

  // dialgo
  const openCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingTask(null);
    setDialogOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Mis Tareas</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Nueva Tarea
        </Button>
      </Box>

      {loadingTasks ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : tasks.length === 0 ? (
        <Typography color="text.secondary">No hay tareas aún.</Typography>
      ) : (
        <List>
          {tasks.map((task) => (
            <ListItem
              key={task.id}
              sx={{
                mb: 1,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: task.done ? 'success.light' : 'background.paper',
              }}
              secondaryAction={
                <Box>
                  <IconButton onClick={() => openEdit(task)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(task.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <Checkbox
                checked={task.done}
                onChange={() => handleToggleDone(task)}
                color="success"
              />
              <ListItemText
                primary={task.name}
                secondary={task.done ? 'Finalizada ' : 'Pendiente '}
                sx={{
                  textDecoration: task.done ? 'line-through' : 'none',
                  color: task.done ? 'text.secondary' : 'text.primary',
                }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Diálogo crear/editar */}
      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
        <Box component="form" action={submitAction}>
          <DialogContent>
            <TextField
              label="Nombre de la tarea"
              name="name"
              fullWidth
              autoFocus
              disabled={isPending}
              defaultValue={editingTask?.name ?? state?.formData?.name ?? ''}
              error={!!state?.errors?.name}
              helperText={state?.errors?.name}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isPending}
              startIcon={isPending ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};