import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, Task } from "../../api/tasks";
import { projectsApi } from "../../api/projects";
import { tagsApi } from "../../api/tags";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import toast from "react-hot-toast";

interface TaskFormProps {
  task?: Task;
  parentId?: string;
  onSuccess: () => void;
}

interface FormValues {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  reminder: string;
  projectId: string;
  recurrence: string;
  tagIds: string[];
}

export function TaskForm({ task, parentId, onSuccess }: TaskFormProps) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "MEDIUM",
      status: task?.status ?? "PENDING",
      dueDate: task?.dueDate ? task.dueDate.slice(0, 16) : "",
      reminder: task?.reminder ? task.reminder.slice(0, 16) : "",
      projectId: task?.projectId ?? "",
      recurrence: task?.recurrence ?? "",
      tagIds: task?.tags.map((t) => t.tag.id) ?? [],
    },
  });

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.getAll });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: tagsApi.getAll });
  const selectedTagIds = watch("tagIds");

  const mutation = useMutation({
    mutationFn: (data: Partial<Task> & { tagIds?: string[] }) =>
      task ? tasksApi.update(task.id, data) : tasksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(task ? "Task updated" : "Task created");
      onSuccess();
    },
    onError: () => toast.error("Something went wrong"),
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      title: values.title,
      description: values.description || undefined,
      priority: values.priority as Task["priority"],
      status: values.status as Task["status"],
      dueDate: values.dueDate || undefined,
      reminder: values.reminder || undefined,
      projectId: values.projectId || undefined,
      recurrence: (values.recurrence as Task["recurrence"]) || undefined,
      tagIds: values.tagIds,
      parentId: parentId,
    });
  };

  const toggleTag = (id: string) => {
    const current = selectedTagIds ?? [];
    setValue("tagIds", current.includes(id) ? current.filter((t) => t !== id) : [...current, id]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Title *"
        placeholder="Task title"
        {...register("title", { required: "Title is required" })}
        error={errors.title?.message}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          placeholder="Task details..."
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Priority"
          {...register("priority")}
          options={[
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium" },
            { value: "HIGH", label: "High" },
            { value: "CRITICAL", label: "Critical" },
          ]}
        />
        <Select
          label="Status"
          {...register("status")}
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "IN_PROGRESS", label: "In Progress" },
            { value: "COMPLETED", label: "Completed" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Due Date" type="datetime-local" {...register("dueDate")} />
        <Input label="Reminder" type="datetime-local" {...register("reminder")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="List"
          {...register("projectId")}
          options={[
            { value: "", label: "No list..." },
            ...projects.map((p: { id: string; name: string }) => ({ value: p.id, label: p.name })),
          ]}
        />
        <Select
          label="Repeat"
          {...register("recurrence")}
          options={[
            { value: "", label: "Does not repeat" },
            { value: "DAILY", label: "Daily" },
            { value: "WEEKLY", label: "Weekly" },
            { value: "MONTHLY", label: "Monthly" },
            { value: "YEARLY", label: "Yearly" },
          ]}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag: { id: string; name: string; color: string }) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  selectedTagIds?.includes(tag.id)
                    ? "text-white ring-2 ring-offset-1"
                    : "text-white opacity-50"
                }`}
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={mutation.isPending} className="flex-1">
          {task ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
