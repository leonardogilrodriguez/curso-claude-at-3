import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import { validateDish, validateIngredient, type DishFormErrors } from './dish-form.validation'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)

  submitted = signal(false)
  errors = signal<DishFormErrors>({})
  ingredientError = signal<string | null>(null)
  liveMessage = signal('')
  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary')

  errorList = () => {
    const e = this.errors()
    return [
      ...(e.name ? [{ field: 'dish-name', message: e.name }] : []),
      ...(e.price ? [{ field: 'dish-price', message: e.price }] : [])
    ]
  }

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: CreateDishDto = {
    name: '',
    description: null,
    price: 0,
    category: 'principal',
    available: true,
    ingredients: []
  }

  newIngredientId = ''
  newIngredientQty = 1

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (this.restaurantId) {
      this.ingredientStore.loadByRestaurant(this.restaurantId)
    }

    if (id && this.restaurantId) {
      this.isEditing = true
      this.dishId = id
      this.loadDish()
    }
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  onIngredientEnter(event: Event): void {
    event.preventDefault()
    this.addIngredient()
  }

  addIngredient(): void {
    const problem = validateIngredient(this.newIngredientId, this.newIngredientQty, this.form.ingredients)
    if (problem) {
      this.ingredientError.set(problem)
      return
    }

    const name = this.getIngredientName(this.newIngredientId)
    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty }
    ]
    this.newIngredientId = ''
    this.newIngredientQty = 1
    this.ingredientError.set(null)
    this.liveMessage.set(`Ingrediente añadido: ${name}.`)
  }

  removeIngredient(ingredientId: string): void {
    const name = this.getIngredientName(ingredientId)
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
    this.liveMessage.set(`Ingrediente quitado: ${name}.`)
    // El botón pulsado desaparece: llevar el foco al selector para no perderlo
    document.getElementById('new-ingredient')?.focus()
  }

  focusField(event: Event, field: string): void {
    event.preventDefault()
    document.getElementById(field)?.focus()
  }

  private validate(): boolean {
    const errors = validateDish(this.form)
    this.errors.set(errors)
    return Object.keys(errors).length === 0
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.submitted.set(true)
    if (!this.validate()) {
      setTimeout(() => this.errorSummary()?.nativeElement.focus())
      return
    }
    this.loading.set(true)
    try {
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
